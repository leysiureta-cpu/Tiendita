import { Boxes, PackagePlus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getProducts,
  PRODUCTS_STORAGE_KEY,
  PRODUCTS_UPDATED_EVENT,
} from '../utils/dashboardData.js'

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

function readInventory() {
  try {
    return { products: getProducts(), error: '' }
  } catch (error) {
    return {
      products: [],
      error: error instanceof Error ? error.message : 'No se pudo cargar el inventario.',
    }
  }
}

function InventoryPage() {
  const [inventoryState, setInventoryState] = useState(readInventory)
  const [search, setSearch] = useState('')
  const { products, error } = inventoryState
  const query = search.trim().toLocaleLowerCase('es')
  const visibleProducts = products.filter((product) =>
    String(product.name ?? '').toLocaleLowerCase('es').includes(query) ||
    String(product.id ?? '').toLocaleLowerCase('es').includes(query) ||
    String(product.category ?? '').toLocaleLowerCase('es').includes(query),
  )

  useEffect(() => {
    function refreshInventory(event) {
      if (
        event.type === 'storage' &&
        event.key &&
        event.key !== PRODUCTS_STORAGE_KEY
      ) {
        return
      }
      setInventoryState(readInventory())
    }

    window.addEventListener('storage', refreshInventory)
    window.addEventListener(PRODUCTS_UPDATED_EVENT, refreshInventory)
    return () => {
      window.removeEventListener('storage', refreshInventory)
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, refreshInventory)
    }
  }, [])

  return (
    <section className="inventory-page">
      <header className="products-page-heading">
        <div>
          <p className="products-eyebrow">CONTROL DE EXISTENCIAS</p>
          <h1><Boxes size={25} aria-hidden="true" /> Inventario</h1>
        </div>
        <Link className="primary-button products-add-button" to="/productos">
          Administrar productos
        </Link>
      </header>

      <div className="inventory-toolbar">
        <label className="products-search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Buscar en inventario"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por producto, categoría o ID"
            type="search"
            value={search}
          />
        </label>
        <span className="inventory-count">{visibleProducts.length} de {products.length} productos</span>
      </div>

      {error && <p className="products-feedback error-message" role="alert">{error}</p>}

      {visibleProducts.length ? (
        <div className="products-table-wrap">
          <table className="products-table inventory-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Producto</th>
                <th scope="col">Categoría</th>
                <th scope="col">Precio</th>
                <th scope="col">Stock disponible</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => (
                <tr key={product.id}>
                  <td>{product.id}</td>
                  <td>
                    <Link
                      className="inventory-product-link"
                      to={`/productos/${encodeURIComponent(String(product.id))}`}
                    >
                      {product.name || 'Sin nombre'}
                    </Link>
                  </td>
                  <td>{product.category || 'Sin categoría'}</td>
                  <td>{currencyFormatter.format(Number(product.price) || 0)}</td>
                  <td>{Number(product.stock ?? product.quantity) || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="products-empty-state inventory-empty-state">
          <span className="products-empty-icon"><PackagePlus size={27} aria-hidden="true" /></span>
          <h2>{products.length ? 'No se encontraron productos' : 'El inventario está vacío'}</h2>
          <p>{products.length ? 'Prueba con otro nombre, categoría o ID.' : 'Registra productos para agregarlos al inventario.'}</p>
          <Link className="primary-button" to="/registrar-producto">Registrar producto</Link>
        </div>
      )}
    </section>
  )
}

export default InventoryPage
