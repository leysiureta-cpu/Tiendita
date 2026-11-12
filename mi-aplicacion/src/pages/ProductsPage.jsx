import {
  ChevronLeft,
  ChevronRight,
  Eye,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductDialog from '../components/ProductDialog.jsx'
import {
  getProducts,
  PRODUCTS_STORAGE_KEY,
  PRODUCTS_UPDATED_EVENT,
  saveProducts,
} from '../utils/dashboardData.js'

const PAGE_SIZE = 8
const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

function readProducts() {
  try {
    return { products: getProducts(), error: '' }
  } catch (error) {
    return {
      products: [],
      error:
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los productos.',
    }
  }
}

function productCategory(product) {
  return String(product.category ?? 'Sin categoría')
}

function productPrice(price) {
  const value = Number(price)
  return Number.isFinite(value) ? currencyFormatter.format(value) : '—'
}

function ProductsPage() {
  const [productState, setProductState] = useState(readProducts)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deletingProduct, setDeletingProduct] = useState(null)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const { products, error: loadError } = productState

  useEffect(() => {
    function refreshProducts(event) {
      if (
        event.type === 'storage' &&
        event.key &&
        event.key !== PRODUCTS_STORAGE_KEY
      ) {
        return
      }
      setProductState(readProducts())
    }

    window.addEventListener('storage', refreshProducts)
    window.addEventListener(PRODUCTS_UPDATED_EVENT, refreshProducts)
    return () => {
      window.removeEventListener('storage', refreshProducts)
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, refreshProducts)
    }
  }, [])

  const categories = useMemo(
    () =>
      [...new Set(products.map(productCategory))].sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' }),
      ),
    [products],
  )

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    return products
      .filter((product) => {
        const matchesSearch =
          !query ||
          String(product.id ?? '').toLocaleLowerCase('es').includes(query) ||
          String(product.name ?? '').toLocaleLowerCase('es').includes(query)
        const matchesCategory = !category || productCategory(product) === category
        return matchesSearch && matchesCategory
      })
      .sort((a, b) => {
        const comparison = String(a.name ?? '').localeCompare(
          String(b.name ?? ''),
          'es',
          { sensitivity: 'base' },
        )
        return sortOrder === 'asc' ? comparison : -comparison
      })
  }, [products, search, category, sortOrder])

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )
  const firstItem = filteredProducts.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0
  const lastItem = Math.min(currentPage * PAGE_SIZE, filteredProducts.length)

  function resetResults() {
    setPage(1)
    setNotice('')
    setActionError('')
  }

  function handleSave(updatedProduct) {
    const nextProducts = products.map((product) =>
      String(product.id) === String(updatedProduct.id) ? updatedProduct : product,
    )
    if (!nextProducts.some((product) => product === updatedProduct)) {
      throw new Error('No se encontró el producto que deseas actualizar.')
    }
    saveProducts(nextProducts)
    setProductState({ products: nextProducts, error: '' })
    setEditingProduct(null)
    setNotice('Los cambios del producto se guardaron correctamente.')
    setActionError('')
  }

  function handleDelete() {
    if (!deletingProduct) return

    const nextProducts = products.filter(
      (product) => String(product.id) !== String(deletingProduct.id),
    )
    if (nextProducts.length === products.length) {
      setActionError('No se encontró el producto que deseas eliminar.')
      return
    }

    try {
      saveProducts(nextProducts)
      setProductState({ products: nextProducts, error: '' })
      setDeletingProduct(null)
      setNotice('El producto se eliminó correctamente.')
      setActionError('')
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el producto.',
      )
    }
  }

  return (
    <section className="products-page">
      <header className="products-page-heading">
        <div>
          <p className="products-eyebrow">CATÁLOGO DE INVENTARIO</p>
          <h1>Consultar productos</h1>
        </div>
        <Link className="primary-button products-add-button" to="/registrar-producto">
          <Plus size={18} aria-hidden="true" />
          Registrar producto
        </Link>
      </header>

      <div className="products-toolbar">
        <label className="products-search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Buscar por nombre o ID"
            onChange={(event) => {
              setSearch(event.target.value)
              resetResults()
            }}
            placeholder="Buscar por nombre o ID"
            type="search"
            value={search}
          />
        </label>
        <label className="products-select">
          <span>Catálogo</span>
          <select
            aria-label="Filtrar por catálogo"
            onChange={(event) => {
              setCategory(event.target.value)
              resetResults()
            }}
            value={category}
          >
            <option value="">Todas las categorías</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="products-select">
          <span>Orden alfabético</span>
          <select
            aria-label="Ordenar alfabéticamente"
            onChange={(event) => {
              setSortOrder(event.target.value)
              resetResults()
            }}
            value={sortOrder}
          >
            <option value="asc">A a Z</option>
            <option value="desc">Z a A</option>
          </select>
        </label>
      </div>

      {(loadError || actionError) && (
        <p className="products-feedback error-message" role="alert">
          {loadError || actionError}
        </p>
      )}
      {notice && (
        <p className="products-feedback success-message" role="status">
          {notice}
        </p>
      )}

      {products.length === 0 && !loadError ? (
        <div className="products-empty-state">
          <span className="products-empty-icon">
            <PackagePlus size={29} aria-hidden="true" />
          </span>
          <h2>El inventario está vacío</h2>
          <p>Los productos registrados aparecerán aquí.</p>
          <Link className="primary-button" to="/registrar-producto">
            <Plus size={18} aria-hidden="true" />
            Registrar producto
          </Link>
        </div>
      ) : filteredProducts.length === 0 && !loadError ? (
        <div className="products-empty-state filtered-empty-state">
          <h2>No se encontraron productos</h2>
          <p>Prueba con otro nombre, ID o categoría.</p>
        </div>
      ) : (
        <>
          <div className="products-table-wrap">
            <table className="products-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Nombre del producto</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Precio</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.id ?? '—'}</td>
                    <td>
                      <Link
                        className="product-name-button"
                        to={`/productos/${encodeURIComponent(String(product.id))}`}
                      >
                        {product.name || 'Sin nombre'}
                      </Link>
                    </td>
                    <td>{productCategory(product)}</td>
                    <td>{productPrice(product.price)}</td>
                    <td>{product.stock ?? '—'}</td>
                    <td>
                      <div className="product-row-actions">
                        <Link
                          aria-label={`Ver detalle de ${product.name}`}
                          className="product-icon-button"
                          to={`/productos/${encodeURIComponent(String(product.id))}`}
                        >
                          <Eye size={17} aria-hidden="true" />
                        </Link>
                        <button
                          aria-label={`Editar ${product.name}`}
                          className="product-icon-button"
                          onClick={() => setEditingProduct(product)}
                          type="button"
                        >
                          <Pencil size={17} aria-hidden="true" />
                        </button>
                        <button
                          aria-label={`Eliminar ${product.name}`}
                          className="product-icon-button delete"
                          onClick={() => {
                            setDeletingProduct(product)
                            setActionError('')
                            setNotice('')
                          }}
                          type="button"
                        >
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="products-pagination">
            <span>
              Mostrando {firstItem}–{lastItem} de {filteredProducts.length}
            </span>
            <div>
              <button
                aria-label="Página anterior"
                className="pagination-button"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
                type="button"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <span className="pagination-current">
                {currentPage} / {pageCount}
              </span>
              <button
                aria-label="Página siguiente"
                className="pagination-button"
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
                type="button"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </footer>
        </>
      )}

      {editingProduct && (
        <ProductDialog
          mode="edit"
          onClose={() => setEditingProduct(null)}
          onSave={handleSave}
          product={editingProduct}
        />
      )}
      {deletingProduct && (
        <div className="product-dialog-backdrop">
          <section
            aria-labelledby="delete-product-title"
            aria-modal="true"
            className="product-dialog delete-confirmation"
            role="dialog"
          >
            <h2 id="delete-product-title">Eliminar producto</h2>
            <p>
              ¿Deseas eliminar <strong>{deletingProduct.name}</strong>? Esta acción
              no se puede deshacer.
            </p>
            {actionError && (
              <p className="products-feedback error-message" role="alert">
                {actionError}
              </p>
            )}
            <div className="product-dialog-actions">
              <button
                className="secondary-button"
                onClick={() => setDeletingProduct(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="danger-button"
                onClick={handleDelete}
                type="button"
              >
                Eliminar
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default ProductsPage
