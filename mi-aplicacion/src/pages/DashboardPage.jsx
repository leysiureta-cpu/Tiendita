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

const bestSellingExamples = [
  { name: 'Coca-Cola de 600 ml', quantity: 35 },
  { name: 'Sabritas', quantity: 28 },
  { name: 'Leche de 1 litro', quantity: 15 },
]

function DashboardPage() {
  const [metrics, setMetrics] = useState(getDashboardMetrics)

  useEffect(() => {
    function refreshMetrics() {
      setMetrics(getDashboardMetrics())
    }

    function handleStorageChange(event) {
      if (!event.key || event.key === PRODUCTS_STORAGE_KEY || event.key === 'mini-super.users') {
        refreshMetrics()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener(PRODUCTS_UPDATED_EVENT, refreshMetrics)
    window.addEventListener('focus', refreshMetrics)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, refreshMetrics)
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
      value: '485',
      caption: 'Dato de ejemplo · no son ventas reales',
      icon: ShoppingCart,
      style: 'sales',
      isExample: true,
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
            <p>Referencia visual para el panel</p>
          </div>
          <span className="example-data-badge">Datos de ejemplo · no son ventas reales</span>
        </header>

        <div className="best-sellers-content">
          <div className="best-sellers-table-wrap">
            <table className="best-sellers-table">
              <thead>
                <tr>
                  <th scope="col">Número</th>
                  <th scope="col">Producto</th>
                  <th scope="col">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {bestSellingExamples.map((product, index) => (
                  <tr key={product.name}>
                    <td>{index + 1}</td>
                    <td>{product.name}</td>
                    <td>{product.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <figure
            aria-label="Gráfica de barras con cantidades de productos de ejemplo"
            className="best-sellers-chart"
          >
            <figcaption>
              <BarChart3 size={17} aria-hidden="true" />
              Cantidades de ejemplo
            </figcaption>
            <div className="horizontal-bar-chart">
              {bestSellingExamples.map((product, index) => (
                <div className="horizontal-bar-row" key={product.name}>
                  <span className="horizontal-bar-label">{product.name}</span>
                  <span
                    aria-label={`${product.quantity} unidades de ejemplo`}
                    className={`horizontal-bar-track bar-tone-${index + 1}`}
                    role="img"
                  >
                    <span
                      className="horizontal-bar-fill"
                      style={{
                        width: `${(product.quantity / bestSellingExamples[0].quantity) * 100}%`,
                      }}
                    />
                  </span>
                  <strong>{product.quantity}</strong>
                </div>
              ))}
            </div>
          </figure>
        </div>
      </section>

    </section>
  )
}

export default DashboardPage
