import {
  BarChart3,
  ClipboardList,
  Package,
  ShoppingCart,
  Store,
  UsersRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getDashboardMetrics,
  PRODUCTS_UPDATED_EVENT,
  PRODUCTS_STORAGE_KEY,
} from '../utils/dashboardData.js'
import { SALES_STORAGE_KEY } from '../utils/reports.js'
import { SALES_UPDATED_EVENT } from '../utils/sales.js'

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

function DashboardPage() {
  const [metrics, setMetrics] = useState(getDashboardMetrics)
  const bestSellerMax = metrics.bestSellers.reduce(
    (max, product) => Math.max(max, product.quantity),
    0,
  )

  useEffect(() => {
    function refreshMetrics() {
      setMetrics(getDashboardMetrics())
    }

    function handleStorageChange(event) {
      if (
        !event.key ||
        event.key === PRODUCTS_STORAGE_KEY ||
        event.key === SALES_STORAGE_KEY ||
        event.key === 'mini-super.users'
      ) {
        refreshMetrics()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener(PRODUCTS_UPDATED_EVENT, refreshMetrics)
    window.addEventListener(SALES_UPDATED_EVENT, refreshMetrics)
    window.addEventListener('focus', refreshMetrics)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, refreshMetrics)
      window.removeEventListener(SALES_UPDATED_EVENT, refreshMetrics)
      window.removeEventListener('focus', refreshMetrics)
    }
  }, [])

  const userCountIsExample = metrics.users === 0
  const cards = [
    {
      title: 'Productos',
      value: metrics.products ?? '—',
      caption: 'Registrados',
      icon: Package,
      path: '/productos',
      style: 'products',
    },
    {
      title: 'Catálogo',
      value: 'Ver categorías',
      caption: 'Abrir catálogo',
      icon: ClipboardList,
      path: '/categorias',
      style: 'catalog',
    },
    {
      title: 'Ventas hoy',
      value: metrics.revenueToday === null
        ? '—'
        : currencyFormatter.format(metrics.revenueToday),
      caption: metrics.salesToday === null
        ? 'No disponibles'
        : `${metrics.salesToday} ventas registradas hoy`,
      icon: ShoppingCart,
      path: '/ventas',
      style: 'sales',
    },
    {
      title: 'Usuarios',
      value: metrics.users === null ? '—' : userCountIsExample ? '3' : metrics.users,
      caption: userCountIsExample ? 'Dato de ejemplo · 0 registrados' : 'Registrados',
      icon: UsersRound,
      path: '/perfil',
      style: 'users',
      isExample: userCountIsExample,
    },
  ]

  return (
    <section className="dashboard-overview">
      <header className="dashboard-page-heading">
        <div>
          <p className="dashboard-eyebrow">RESUMEN DE LA TIENDA</p>
          <h1>
            <Store size={29} strokeWidth={1.8} aria-hidden="true" />
            Panel de control
          </h1>
        </div>
      </header>

      {metrics.error && (
        <p className="dashboard-data-error" role="alert">
          {metrics.error}
        </p>
      )}

      <div className="dashboard-summary-cards">
        {cards.map(({ title, value, caption, icon: Icon, path, style, isExample }) => {
          const content = (
            <>
              <span className={`summary-card-icon ${style}`}>
                <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="summary-card-copy">
                <span className="summary-card-title">{title}</span>
                <strong className={style === 'catalog' ? 'catalog-card-value' : ''}>
                  {value}
                </strong>
                <span className={`summary-card-caption${isExample ? ' example' : ''}`}>
                  {caption}
                </span>
              </span>
            </>
          )

          return path ? (
            <Link className="summary-card" key={title} to={path}>
              {content}
            </Link>
          ) : (
            <article className="summary-card" key={title}>
              {content}
            </article>
          )
        })}
      </div>

      <section className="best-sellers-panel">
        <header className="best-sellers-heading">
          <div>
            <h2>Productos más vendidos</h2>
            <p>Unidades vendidas registradas</p>
          </div>
        </header>

        <div className="best-sellers-content">
          <figure
            aria-label="Gráfica de barras con unidades vendidas por producto, ordenadas de mayor a menor"
            className="best-sellers-chart"
          >
            <figcaption>
              <span className="best-sellers-chart-title">
                <BarChart3 size={17} aria-hidden="true" />
                Unidades vendidas por producto
              </span>
              <span className="best-sellers-chart-count">
                {metrics.bestSellers.length} productos
              </span>
            </figcaption>
            {metrics.bestSellers.length > 0 ? (
              <ol className="horizontal-bar-chart">
                {metrics.bestSellers.map((product, index) => (
                  <li className="horizontal-bar-row" key={product.name}>
                    <div className="horizontal-bar-heading">
                      <span className="horizontal-bar-rank">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="horizontal-bar-label">{product.name}</span>
                      <strong>
                        {product.quantity}
                        <span>unidades</span>
                      </strong>
                    </div>
                    <span
                      aria-label={`${product.name}: ${product.quantity} unidades vendidas`}
                      className="horizontal-bar-track"
                      role="img"
                    >
                      <span
                        className="horizontal-bar-fill"
                        style={{
                          width: `${(product.quantity / bestSellerMax) * 100}%`,
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="best-sellers-empty" role="status">
                <ShoppingCart size={23} strokeWidth={1.7} aria-hidden="true" />
                <p>
                  {metrics.error
                    ? 'No se pudieron cargar los datos de la gráfica.'
                    : 'Todavía no hay ventas registradas.'}
                </p>
                <span>
                  {metrics.error
                    ? 'Inténtalo de nuevo cuando los datos estén disponibles.'
                    : 'Registra una venta para ver aquí los productos más vendidos.'}
                </span>
              </div>
            )}
          </figure>
        </div>
      </section>

      <section className="best-sellers-panel dashboard-inventory-panel">
        <header className="best-sellers-heading">
          <div>
            <h2>Inventario disponible</h2>
            <p>{metrics.inventory.length} productos registrados</p>
          </div>
          <Link className="dashboard-inventory-link" to="/inventario">
            Ver inventario
          </Link>
        </header>
        <div className="products-table-wrap">
          <table className="products-table dashboard-inventory-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Producto</th>
                <th scope="col">Categoría</th>
                <th scope="col">Precio</th>
                <th scope="col">Stock</th>
              </tr>
            </thead>
            <tbody>
              {metrics.inventory.map((product) => (
                <tr key={product.id}>
                  <td>{product.id}</td>
                  <td>{product.name}</td>
                  <td>{product.category || 'Sin categoría'}</td>
                  <td>{currencyFormatter.format(Number(product.price) || 0)}</td>
                  <td>{Number(product.stock ?? product.quantity) || 0}</td>
                </tr>
              ))}
              {metrics.inventory.length === 0 && (
                <tr><td colSpan="5">No hay productos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </section>
  )
}

export default DashboardPage
