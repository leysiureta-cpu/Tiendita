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
import useAuth from '../hooks/useAuth.js'
import { getDashboardData } from '../utils/api.js'

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})
const quantityFormatter = new Intl.NumberFormat('es-MX')

function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [metrics, setMetrics] = useState({
    products: null,
    inventory: [],
    salesToday: null,
    revenueToday: null,
    bestSellers: [],
    userCount: null,
    error: '',
  })

  useEffect(() => {
    let active = true
    async function refreshMetrics() {
      try {
        const data = await getDashboardData()
        if (active) setMetrics({ ...data, error: '' })
      } catch (error) {
        if (active) {
          setMetrics((current) => ({
            ...current,
            error: error instanceof Error
              ? error.message
              : 'No se pudieron cargar los datos del panel.',
          }))
        }
      }
    }

    void refreshMetrics()
    window.addEventListener('focus', refreshMetrics)
    return () => {
      active = false
      window.removeEventListener('focus', refreshMetrics)
    }
  }, [])

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
      value: metrics.userCount ?? '—',
      caption: metrics.userCount === null
          ? 'Cargando…'
          : 'Registrados',
      icon: UsersRound,
      path: '/usuarios',
      style: 'users',
    },
  ].filter((card) => isAdmin || !['Usuarios', 'Catálogo'].includes(card.title))

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
        {cards.map(({ title, value, caption, icon: Icon, path, style }) => {
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
                <span className="summary-card-caption">
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

        {metrics.bestSellers.length > 0 ? (
          <figure
            aria-label="Gráfica de barras con unidades realmente vendidas"
            className="best-sellers-chart"
          >
            <figcaption>
              <BarChart3 size={18} aria-hidden="true" />
              Unidades vendidas
            </figcaption>
            <ol className="best-sellers-chart-list">
              {metrics.bestSellers.map((product, index) => (
                <li className="best-sellers-chart-row" key={`${product.name}-${index}`}>
                  <div className="best-sellers-chart-label">
                    <span className="best-sellers-chart-rank">{index + 1}</span>
                    <span className="best-sellers-chart-name">{product.name}</span>
                    <strong>
                      {quantityFormatter.format(product.quantity)}
                      <span> ud.</span>
                    </strong>
                  </div>
                  <div aria-hidden="true" className="best-sellers-chart-track">
                    <span
                      className="best-sellers-chart-fill"
                      style={{
                        width: `${(product.quantity / metrics.bestSellers[0].quantity) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </figure>
        ) : (
          <div className="best-sellers-empty" role="status">
            <span className="best-sellers-empty-icon">
              <BarChart3 size={23} aria-hidden="true" />
            </span>
            <div>
              <strong>{metrics.error ? 'No se pudieron cargar las ventas' : 'Todavía no hay ventas'}</strong>
              <p>
                {metrics.error
                  ? 'Consulta el aviso del panel para conocer el problema.'
                  : 'Los productos aparecerán aquí cuando registres ventas.'}
              </p>
            </div>
          </div>
        )}
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
