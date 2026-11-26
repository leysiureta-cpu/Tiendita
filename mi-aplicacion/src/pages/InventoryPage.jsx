import {
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  Minus,
  PackagePlus,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import {
  createInventoryMovement,
  getCategories,
  getInventory,
  getInventoryMovements,
} from '../utils/api.js'

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

const statusLabels = {
  sufficient: 'Suficiente',
  low: 'Pocas existencias',
  out: 'Agotado',
}

function localDateTimeValue() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getInventoryStatus(product) {
  if (['sufficient', 'low', 'out'].includes(product.inventoryStatus)) {
    return product.inventoryStatus
  }

  const stock = Number(product.stock)
  if (stock <= 0) return 'out'
  return stock <= 5 ? 'low' : 'sufficient'
}

function InventoryPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [inventoryState, setInventoryState] = useState({
    products: [],
    error: '',
    loading: true,
  })
  const [categoriesState, setCategoriesState] = useState({ categories: [], error: '' })
  const [historyState, setHistoryState] = useState({
    movements: [],
    error: '',
    loading: true,
    currentPage: 1,
    lastPage: 1,
    total: 0,
  })
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [sortOption, setSortOption] = useState('name-asc')
  const [movementDialog, setMovementDialog] = useState(null)
  const [movementForm, setMovementForm] = useState({
    productId: '',
    type: 'entrada',
    quantity: '',
    reason: '',
    movementAt: localDateTimeValue(),
  })
  const [movementError, setMovementError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const operationId = useRef(null)
  const { products, error, loading } = inventoryState
  const { movements, error: historyError, loading: historyLoading } = historyState

  const refreshInventory = useCallback(async () => {
    setInventoryState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const nextProducts = await getInventory()
      if (!Array.isArray(nextProducts)) {
        throw new Error('El servidor devolvió una lista de inventario no válida.')
      }
      setInventoryState({ products: nextProducts, error: '', loading: false })
    } catch (loadError) {
      setInventoryState((current) => ({
        ...current,
        error: loadError instanceof Error
          ? loadError.message
          : 'No se pudo cargar el inventario.',
        loading: false,
      }))
    }
  }, [])

  const refreshMovements = useCallback(async (page = 1) => {
    setHistoryState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const response = await getInventoryMovements(page)
      if (!Array.isArray(response?.data) || !response?.meta) {
        throw new Error('El servidor devolvió un historial de movimientos no válido.')
      }
      setHistoryState({
        movements: response.data,
        error: '',
        loading: false,
        currentPage: response.meta.currentPage,
        lastPage: response.meta.lastPage,
        total: response.meta.total,
      })
    } catch (loadError) {
      setHistoryState((current) => ({
        ...current,
        error: loadError instanceof Error
          ? loadError.message
          : 'No se pudo cargar el historial de movimientos.',
        loading: false,
      }))
    }
  }, [])

  useEffect(() => {
    void refreshInventory()
  }, [refreshInventory])

  useEffect(() => {
    let active = true
    getCategories()
      .then((items) => {
        if (!Array.isArray(items)) {
          throw new Error('El servidor devolvió una lista de categorías no válida.')
        }
        if (active) setCategoriesState({ categories: items, error: '' })
      })
      .catch((loadError) => {
        if (active) {
          setCategoriesState({
            categories: [],
            error: loadError instanceof Error
              ? loadError.message
              : 'No se pudieron cargar las categorías.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (isAdmin) void refreshMovements(1)
  }, [isAdmin, refreshMovements])

  useEffect(() => {
    function refreshOnFocus() {
      void refreshInventory()
      if (isAdmin) void refreshMovements(historyState.currentPage)
    }

    window.addEventListener('focus', refreshOnFocus)
    return () => window.removeEventListener('focus', refreshOnFocus)
  }, [historyState.currentPage, isAdmin, refreshInventory, refreshMovements])

  const categories = useMemo(() => {
    const options = new Map(
      categoriesState.categories.map((category) => [
        String(category.id),
        category.name,
      ]),
    )
    for (const product of products) {
      if (product.categoryId != null && product.category) {
        options.set(String(product.categoryId), product.category)
      }
    }
    return [...options.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
  }, [categoriesState.categories, products])

  const summary = useMemo(() => products.reduce((counts, product) => {
    counts.total += 1
    counts[getInventoryStatus(product)] += 1
    return counts
  }, { total: 0, sufficient: 0, low: 0, out: 0 }), [products])

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    const [sortBy, sortDirection] = sortOption.split('-')

    return products
      .filter((product) => {
        const matchesSearch = !query ||
          String(product.name ?? '').toLocaleLowerCase('es').includes(query) ||
          String(product.id ?? '').toLocaleLowerCase('es').includes(query)
        const matchesCategory = !categoryId ||
          String(product.categoryId) === categoryId
        const matchesStatus = !status || getInventoryStatus(product) === status
        return matchesSearch && matchesCategory && matchesStatus
      })
      .sort((a, b) => {
        const comparison = sortBy === 'name'
          ? String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es', { sensitivity: 'base' })
          : Number(a[sortBy] ?? 0) - Number(b[sortBy] ?? 0)
        return sortDirection === 'desc' ? -comparison : comparison
      })
  }, [categoryId, products, search, sortOption, status])

  function openMovement(type, product = null) {
    operationId.current = window.crypto.randomUUID()
    setMovementForm({
      productId: product ? String(product.id) : '',
      type,
      quantity: '',
      reason: '',
      movementAt: localDateTimeValue(),
    })
    setMovementError('')
    setSuccess('')
    setMovementDialog(true)
  }

  function closeMovement() {
    setMovementDialog(null)
    operationId.current = null
    setMovementError('')
  }

  function updateMovementField(event) {
    const { name, value } = event.target
    operationId.current = window.crypto.randomUUID()
    setMovementForm((current) => ({ ...current, [name]: value }))
    setMovementError('')
  }

  async function handleMovementSubmit(event) {
    event.preventDefault()
    setMovementError('')
    const quantity = Number(movementForm.quantity)
    const reason = movementForm.reason.trim()
    const product = products.find(
      (item) => String(item.id) === movementForm.productId,
    )

    if (!product) {
      setMovementError('Selecciona un producto válido.')
      return
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setMovementError('La cantidad debe ser un número entero mayor que cero.')
      return
    }
    if (movementForm.type === 'salida' && quantity > Number(product.stock)) {
      setMovementError('La salida no puede superar las existencias disponibles.')
      return
    }
    if (!reason || reason.length > 1000) {
      setMovementError('Escribe un motivo de hasta 1000 caracteres.')
      return
    }
    const movementDate = new Date(movementForm.movementAt)
    if (!movementForm.movementAt || Number.isNaN(movementDate.getTime())) {
      setMovementError('Selecciona una fecha y hora válidas.')
      return
    }

    setIsSubmitting(true)
    try {
      const movement = await createInventoryMovement({
        operationId: operationId.current,
        productId: Number(movementForm.productId),
        type: movementForm.type,
        quantity,
        reason,
        movementAt: movementDate.toISOString(),
      })
      closeMovement()
      setSuccess(
        `Movimiento registrado. Existencias de ${movement.productName}: ${movement.newStock}.`,
      )
      await Promise.all([refreshInventory(), refreshMovements(1)])
    } catch (saveError) {
      setMovementError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo registrar el movimiento.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="inventory-page">
      <header className="products-page-heading">
        <div>
          <p className="products-eyebrow">CONTROL DE EXISTENCIAS</p>
          <h1><Boxes size={25} aria-hidden="true" /> Inventario</h1>
        </div>
        {isAdmin && (
          <button
            className="primary-button products-add-button"
            onClick={() => openMovement('entrada')}
            type="button"
          >
            <Plus size={18} aria-hidden="true" />
            Registrar movimiento
          </button>
        )}
      </header>

      <div aria-label="Resumen de existencias" className="inventory-summary-grid">
        <article className="inventory-summary-card">
          <span className="inventory-summary-icon"><Boxes size={19} aria-hidden="true" /></span>
          <div><span>Total de productos</span><strong>{summary.total}</strong></div>
        </article>
        <article className="inventory-summary-card sufficient">
          <span className="inventory-summary-icon"><CheckCircle2 size={19} aria-hidden="true" /></span>
          <div><span>Existencias suficientes</span><strong>{summary.sufficient}</strong></div>
        </article>
        <article className="inventory-summary-card low">
          <span className="inventory-summary-icon"><Clock3 size={19} aria-hidden="true" /></span>
          <div><span>Pocas existencias (1–5)</span><strong>{summary.low}</strong></div>
        </article>
        <article className="inventory-summary-card out">
          <span className="inventory-summary-icon"><PackagePlus size={19} aria-hidden="true" /></span>
          <div><span>Agotados</span><strong>{summary.out}</strong></div>
        </article>
      </div>

      <div className="inventory-filters">
        <label className="products-search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Buscar en inventario por nombre o ID"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o ID"
            type="search"
            value={search}
          />
        </label>
        <label className="products-select">
          <span>Categoría</span>
          <select
            aria-label="Filtrar por categoría"
            onChange={(event) => setCategoryId(event.target.value)}
            value={categoryId}
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className="products-select">
          <span>Estado del inventario</span>
          <select
            aria-label="Filtrar por estado del inventario"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">Todos los estados</option>
            <option value="sufficient">Suficiente</option>
            <option value="low">Pocas existencias</option>
            <option value="out">Agotado</option>
          </select>
        </label>
        <label className="products-select">
          <span>Ordenar por</span>
          <select
            aria-label="Ordenar inventario"
            onChange={(event) => setSortOption(event.target.value)}
            value={sortOption}
          >
            <option value="name-asc">Nombre: A a Z</option>
            <option value="name-desc">Nombre: Z a A</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="stock-asc">Existencias: menor a mayor</option>
            <option value="stock-desc">Existencias: mayor a menor</option>
          </select>
        </label>
      </div>

      {(error || categoriesState.error) && (
        <p className="products-feedback error-message" role="alert">
          {error || categoriesState.error}
        </p>
      )}
      {success && <p className="products-feedback success-message" role="status">{success}</p>}
      <div className="inventory-results-count">
        {visibleProducts.length} de {products.length} productos
      </div>

      {loading ? (
        <div className="products-empty-state inventory-empty-state" role="status">
          <p>Cargando inventario…</p>
        </div>
      ) : error ? (
        <div className="products-empty-state inventory-empty-state">
          <h2>No se pudo cargar el inventario</h2>
          <p>Revisa la conexión e inténtalo nuevamente.</p>
        </div>
      ) : visibleProducts.length ? (
        <div className="products-table-wrap">
          <table className="products-table inventory-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Producto</th>
                <th scope="col">Categoría</th>
                <th scope="col">Precio</th>
                <th scope="col">Stock actual</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => {
                const inventoryStatus = getInventoryStatus(product)
                return (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>
                      <Link
                        className="inventory-product-link"
                        to={`/productos/${encodeURIComponent(String(product.id))}`}
                      >
                        {product.name || 'Sin nombre'}
                      </Link>
                      {!product.active && <span className="employee-status inactive inventory-inactive-badge">Inactivo</span>}
                    </td>
                    <td>{product.category || 'Sin categoría'}</td>
                    <td>{currencyFormatter.format(Number(product.price) || 0)}</td>
                    <td>{Number(product.stock) || 0}</td>
                    <td>
                      <span className={`inventory-status-badge ${inventoryStatus}`}>
                        {statusLabels[inventoryStatus]}
                      </span>
                    </td>
                    <td>
                      {isAdmin ? (
                        <div className="inventory-row-actions">
                          <button
                            aria-label={`Registrar entrada de ${product.name}`}
                            className="inventory-action-button entry"
                            onClick={() => openMovement('entrada', product)}
                            type="button"
                          >
                            <Plus size={16} aria-hidden="true" />
                            Entrada
                          </button>
                          <button
                            aria-label={`Registrar salida de ${product.name}`}
                            className="inventory-action-button exit"
                            disabled={Number(product.stock) === 0}
                            onClick={() => openMovement('salida', product)}
                            type="button"
                          >
                            <Minus size={16} aria-hidden="true" />
                            Salida
                          </button>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="products-empty-state inventory-empty-state">
          <span className="products-empty-icon"><PackagePlus size={27} aria-hidden="true" /></span>
          <h2>{products.length ? 'No se encontraron productos' : 'El inventario está vacío'}</h2>
          <p>{products.length ? 'Prueba con otros filtros.' : 'Los productos registrados aparecerán aquí.'}</p>
          {isAdmin && products.length === 0 && (
            <Link className="primary-button" to="/registrar-producto">Registrar producto</Link>
          )}
        </div>
      )}

      {isAdmin && (
      <section aria-labelledby="inventory-history-title" className="inventory-history">
        <header className="inventory-history-heading">
          <div>
            <p className="products-eyebrow">TRAZABILIDAD</p>
            <h2 id="inventory-history-title"><History size={21} aria-hidden="true" /> Historial de movimientos</h2>
          </div>
          <span>{historyState.total} movimientos</span>
        </header>

        {historyError && <p className="products-feedback error-message" role="alert">{historyError}</p>}
        {historyLoading ? (
          <p className="inventory-history-message" role="status">Cargando historial…</p>
        ) : movements.length ? (
          <>
            <div className="products-table-wrap">
              <table className="products-table inventory-history-table">
                <thead>
                  <tr>
                    <th scope="col">Fecha y hora</th>
                    <th scope="col">Producto</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Cantidad</th>
                    <th scope="col">Existencias anteriores</th>
                    <th scope="col">Existencias posteriores</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatDateTime(movement.movementAt)}</td>
                      <td>{movement.productName}</td>
                      <td>
                        <span className={`inventory-movement-type ${movement.type}`}>
                          {movement.type === 'entrada' ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td>{movement.quantity}</td>
                      <td>{movement.previousStock}</td>
                      <td>{movement.newStock}</td>
                      <td>{movement.reason}</td>
                      <td>{movement.userName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="products-pagination inventory-history-pagination">
              <span>
                Página {historyState.currentPage} de {historyState.lastPage}
              </span>
              <div>
                <button
                  aria-label="Página anterior del historial"
                  className="pagination-button"
                  disabled={historyState.currentPage <= 1}
                  onClick={() => void refreshMovements(historyState.currentPage - 1)}
                  type="button"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  aria-label="Página siguiente del historial"
                  className="pagination-button"
                  disabled={historyState.currentPage >= historyState.lastPage}
                  onClick={() => void refreshMovements(historyState.currentPage + 1)}
                  type="button"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </footer>
          </>
        ) : historyError ? null : (
          <p className="inventory-history-message">
            Todavía no hay movimientos de inventario registrados.
          </p>
        )}
      </section>
      )}

      {movementDialog && (
        <div className="product-dialog-backdrop">
          <section
            aria-labelledby="inventory-movement-title"
            aria-modal="true"
            className="product-dialog inventory-movement-dialog"
            role="dialog"
          >
            <header className="product-dialog-header">
              <div>
                <p className="products-eyebrow">CONTROL DE EXISTENCIAS</p>
                <h2 id="inventory-movement-title">Registrar movimiento</h2>
              </div>
              <button
                aria-label="Cerrar"
                className="product-dialog-close"
                disabled={isSubmitting}
                onClick={closeMovement}
                type="button"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <form className="inventory-movement-form" noValidate onSubmit={handleMovementSubmit}>
              <label>
                Tipo de movimiento
                <select
                  name="type"
                  onChange={updateMovementField}
                  value={movementForm.type}
                >
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>
              </label>
              <label>
                Producto
                <select
                  name="productId"
                  onChange={updateMovementField}
                  required
                  value={movementForm.productId}
                >
                  <option value="">Selecciona un producto</option>
                  {products.map((product) => (
                    <option key={product.id} value={String(product.id)}>
                      {product.name} — Stock: {product.stock}
                    </option>
                  ))}
                </select>
              </label>
              {movementForm.productId && (
                <p className="inventory-current-stock">
                  Existencias actuales: {
                    products.find((product) => String(product.id) === movementForm.productId)?.stock ?? 0
                  }
                </p>
              )}
              <label>
                Cantidad que {movementForm.type === 'entrada' ? 'ingresa' : 'sale'}
                <input
                  max="4294967295"
                  min="1"
                  name="quantity"
                  onChange={updateMovementField}
                  required
                  step="1"
                  type="number"
                  value={movementForm.quantity}
                />
              </label>
              <label>
                Motivo
                <textarea
                  maxLength="1000"
                  name="reason"
                  onChange={updateMovementField}
                  required
                  rows="3"
                  value={movementForm.reason}
                />
              </label>
              <label>
                Fecha y hora del movimiento
                <input
                  name="movementAt"
                  onChange={updateMovementField}
                  required
                  type="datetime-local"
                  value={movementForm.movementAt}
                />
              </label>
              {movementError && <p className="products-feedback error-message" role="alert">{movementError}</p>}
              <div className="product-dialog-actions">
                <button
                  className="secondary-button"
                  disabled={isSubmitting}
                  onClick={closeMovement}
                  type="button"
                >
                  Cancelar
                </button>
                <button className="primary-button" disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Guardando…' : 'Confirmar movimiento'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default InventoryPage
