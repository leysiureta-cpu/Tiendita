import {
  Banknote,
  BarChart3,
  CalendarDays,
  CreditCard,
  FilePlus2,
  FileText,
  Landmark,
  Package,
  ReceiptText,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  getSavedReports,
  saveSalesReport,
} from '../utils/reports.js'
import { getSalesReport } from '../utils/api.js'

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})
const numberFormatter = new Intl.NumberFormat('es-MX')
const paymentOptions = {
  efectivo: { label: 'Efectivo', icon: Banknote },
  tarjeta: { label: 'Tarjeta', icon: CreditCard },
  transferencia: { label: 'Transferencia', icon: Landmark },
}
const categoryColors = [
  '#2563eb', '#f97316', '#eab308', '#16a34a', '#db2777',
  '#7c3aed', '#0d9488', '#dc2626', '#4f46e5', '#65a30d',
  '#0891b2', '#c026d3', '#ca8a04', '#475569', '#ea580c',
]
const knownCategories = [
  'bebidas',
  'botanas',
  'dulces y golosinas',
  'lacteos',
  'panaderia',
  'abarrotes y productos basicos',
  'enlatados y conservas',
  'limpieza',
  'higiene personal',
  'congelados',
]

function getCategoryColor(name) {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
  const knownIndex = knownCategories.indexOf(normalized)
  if (knownIndex >= 0) return categoryColors[knownIndex]
  const hash = [...normalized].reduce((value, character) => (
    (value * 31 + character.charCodeAt(0)) >>> 0
  ), 0)
  return categoryColors[hash % categoryColors.length]
}

function CategoryDonut({ categories, units }) {
  const [activeCategory, setActiveCategory] = useState(null)
  const circumference = 2 * Math.PI * 42
  const segments = categories.map((category, index) => ({
    category,
    segmentLength: category.quantity / units * circumference,
    segmentOffset: categories
      .slice(0, index)
      .reduce((total, previous) => total + previous.quantity / units * circumference, 0),
    color: getCategoryColor(category.category),
  }))
  const active = categories.find((category) => category.category === activeCategory)

  return (
    <div className="report-category-donut-layout">
      <div className="report-category-donut-wrap">
        <svg
          aria-label="Distribución de unidades vendidas por categoría"
          className="report-category-donut"
          role="img"
          viewBox="0 0 100 100"
        >
          <circle className="report-donut-track" cx="50" cy="50" r="42" />
          {segments.map(({ category, segmentLength, segmentOffset, color }) => {
            const description = `${category.category}: ${numberFormatter.format(category.quantity)} unidades, ${category.percentage}%`
            return (
              <circle
                aria-label={description}
                className="report-donut-segment"
                cx="50"
                cy="50"
                key={category.category}
                onFocus={() => setActiveCategory(category.category)}
                onMouseEnter={() => setActiveCategory(category.category)}
                onMouseLeave={() => setActiveCategory(null)}
                r="42"
                role="img"
                stroke={color}
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={-segmentOffset}
                tabIndex="0"
              >
                <title>{description}</title>
              </circle>
            )
          })}
        </svg>
        <div aria-live="polite" className="report-donut-center">
          <strong>{active ? `${active.percentage}%` : numberFormatter.format(units)}</strong>
          <span>{active?.category ?? 'unidades'}</span>
        </div>
      </div>
      <ul className="report-category-legend">
        {categories.map((category) => {
          const color = getCategoryColor(category.category)
          return (
            <li key={category.category}>
              <button
                aria-label={`${category.category}: ${numberFormatter.format(category.quantity)} unidades, ${category.percentage}%`}
                onBlur={() => setActiveCategory(null)}
                onFocus={() => setActiveCategory(category.category)}
                onMouseEnter={() => setActiveCategory(category.category)}
                onMouseLeave={() => setActiveCategory(null)}
                type="button"
              >
                <i aria-hidden="true" style={{ '--category-color': color }} />
                <span>{category.category}</span>
                <strong>{numberFormatter.format(category.quantity)}</strong>
                <small>{category.percentage}%</small>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function smoothPath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)]
    const current = points[index]
    const next = points[index + 1]
    const following = points[Math.min(points.length - 1, index + 2)]
    const controlOneX = current.x + (next.x - previous.x) / 6
    const controlOneY = current.y + (next.y - previous.y) / 6
    const controlTwoX = next.x - (following.x - current.x) / 6
    const controlTwoY = next.y - (following.y - current.y) / 6
    path += ` C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${next.x} ${next.y}`
  }
  return path
}

function SalesAreaChart({ summary, isSingleDay }) {
  const values = isSingleDay ? summary.hourlySales : summary.dailySales
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const maxRevenue = Math.max(...values.map((entry) => entry.revenue), 0)
  const width = 760
  const top = 20
  const bottom = 205
  const points = values.map((entry, index) => ({
    x: values.length === 1 ? width / 2 : 20 + index * (width - 40) / (values.length - 1),
    y: bottom - (maxRevenue ? entry.revenue / maxRevenue * (bottom - top) : 0),
    entry,
  }))
  const line = smoothPath(points)
  const area = points.length
    ? `${line} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`
    : ''
  const labelIndexes = [...new Set([0, Math.round((values.length - 1) / 3), Math.round((values.length - 1) * 2 / 3), values.length - 1])]
  const activeIndex = hoveredIndex ?? values.findIndex((entry) => entry.revenue > 0)
  const activeEntry = values[activeIndex] ?? null
  const activeLabel = activeEntry
    ? isSingleDay ? activeEntry.hour : formatShortDate(activeEntry.date)
    : ''

  return (
    <article className="report-chart-panel report-area-panel">
      <header className="report-panel-heading">
        <div>
          <h2>{isSingleDay ? 'Ventas por hora' : 'Evolución de ventas'}</h2>
          <p>{isSingleDay ? 'Ingresos registrados en cada hora del día' : 'Ingresos diarios durante el periodo seleccionado'}</p>
        </div>
        <BarChart3 size={19} aria-hidden="true" />
      </header>
      {summary.sales ? (
        <div className="report-area-content">
          <svg
            aria-label={isSingleDay ? 'Área de ingresos por hora' : 'Área de ingresos por día'}
            className="report-area-chart"
            preserveAspectRatio="none"
            role="img"
            viewBox="0 0 760 260"
          >
            <defs>
              <linearGradient id="sales-area-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity=".32" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity=".015" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((lineIndex) => {
              const y = top + lineIndex * (bottom - top) / 3
              return <line className="report-area-gridline" key={lineIndex} x1="20" x2="740" y1={y} y2={y} />
            })}
            {area && <path className="report-area-fill" d={area} />}
            {line && <path className="report-area-line" d={line} />}
            {points.map((point, index) => {
              const label = isSingleDay ? point.entry.hour : formatShortDate(point.entry.date)
              const tooltip = `${label}: ${currencyFormatter.format(point.entry.revenue)}, ${numberFormatter.format(point.entry.sales)} ventas, ${numberFormatter.format(point.entry.units)} unidades`
              return (
                <g
                  key={label}
                  aria-label={tooltip}
                  onBlur={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  role="img"
                  tabIndex="0"
                >
                  <circle className="report-area-hit-target" cx={point.x} cy={point.y} r="10" />
                  <circle className="report-area-point" cx={point.x} cy={point.y} r={hoveredIndex === index ? 5 : 3.5}>
                    <title>{tooltip}</title>
                  </circle>
                </g>
              )
            })}
            {labelIndexes.map((index) => {
              const point = points[index]
              if (!point) return null
              const label = isSingleDay ? point.entry.hour : formatShortDate(point.entry.date)
              return <text className="report-area-axis-label" key={`${label}-${index}`} textAnchor="middle" x={point.x} y="238">{label}</text>
            })}
          </svg>
          {activeEntry && (
            <div aria-live="polite" className="report-area-tooltip">
              <strong>{activeLabel}</strong>
              <span>{currencyFormatter.format(activeEntry.revenue)}</span>
              <small>{numberFormatter.format(activeEntry.sales)} ventas · {numberFormatter.format(activeEntry.units)} unidades</small>
            </div>
          )}
        </div>
      ) : (
        <div className="report-empty-state compact"><BarChart3 size={22} aria-hidden="true" /><p>No hay ventas para mostrar en este periodo.</p></div>
      )}
    </article>
  )
}

function getLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function shiftDate(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + days)
  return getLocalDateKey(date)
}

function getInitialSavedReports() {
  try {
    return { reports: getSavedReports(), error: '' }
  } catch (error) {
    return {
      reports: [],
      error: error instanceof Error
        ? error.message
        : 'No se pudieron consultar los reportes guardados.',
    }
  }
}

function formatDate(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function ReportsPage() {
  const today = getLocalDateKey()
  const [savedState, setSavedState] = useState(getInitialSavedReports)
  const [filter, setFilter] = useState('today')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [summaryState, setSummaryState] = useState({
    summary: null,
    loading: true,
    error: '',
  })
  const [selectedSavedReport, setSelectedSavedReport] = useState(null)
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!startDate || !endDate || startDate > endDate) {
      setSummaryState({ summary: null, loading: false, error: '' })
      return undefined
    }

    let active = true
    setSummaryState((current) => ({ ...current, loading: true, error: '' }))
    getSalesReport(startDate, endDate)
      .then((summary) => {
        if (active) setSummaryState({ summary, loading: false, error: '' })
      })
      .catch((error) => {
        if (active) {
          setSummaryState({
            summary: null,
            loading: false,
            error: error instanceof Error
              ? error.message
              : 'No se pudo consultar el reporte.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [startDate, endDate])

  const summary = summaryState.summary
  const visibleProducts = useMemo(
    () => showAllProducts ? summary?.rows ?? [] : (summary?.rows ?? []).slice(0, 10),
    [showAllProducts, summary],
  )

  function applyRange(nextStart, nextEnd, nextFilter) {
    setFilter(nextFilter)
    setStartDate(nextStart)
    setEndDate(nextEnd)
    setSelectedSavedReport(null)
    setShowAllProducts(false)
    setNotice('')
  }

  function selectPreset(preset) {
    const date = getLocalDateKey()
    if (preset === 'today') {
      applyRange(date, date, preset)
    } else if (preset === 'week') {
      const weekday = new Date(`${date}T12:00:00`).getDay()
      const daysSinceMonday = (weekday + 6) % 7
      applyRange(shiftDate(date, -daysSinceMonday), date, preset)
    } else {
      applyRange(`${date.slice(0, 7)}-01`, date, preset)
    }
  }

  function handleCustomDateChange(which, value) {
    setFilter('custom')
    setSelectedSavedReport(null)
    setShowAllProducts(false)
    setNotice('')
    if (which === 'start') setStartDate(value)
    else setEndDate(value)
  }

  function handleSaveReport() {
    if (!summary || !startDate || !endDate) return

    const report = {
      id: window.crypto.randomUUID(),
      type: 'sales',
      startDate,
      endDate,
      summary,
      savedAt: new Date().toISOString(),
    }

    try {
      setSavedState({ reports: saveSalesReport(report), error: '' })
      setSelectedSavedReport(report.id)
      setNotice('El reporte se guardó correctamente para futuras consultas.')
    } catch (error) {
      setSavedState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'No se pudo guardar el reporte.',
      }))
    }
  }

  function handleSelectSavedReport(report) {
    setSelectedSavedReport(report.id)
    setFilter('custom')
    setStartDate(report.startDate)
    setEndDate(report.endDate)
    setShowAllProducts(false)
    setNotice('')
  }

  const periodLabel = startDate && endDate
    ? `${formatDate(startDate)} – ${formatDate(endDate)}`
    : 'Selecciona un rango de fechas'
  const isSingleDay = startDate === endDate
  const maxDailyRevenue = Math.max(0, ...(summary?.dailySales ?? []).map((day) => day.revenue))
  const maxProductQuantity = Math.max(0, ...(summary?.rows ?? []).slice(0, 8).map((row) => row.quantity))
  const maxCategoryQuantity = Math.max(0, ...(summary?.categories ?? []).map((category) => category.quantity))

  return (
    <section className="reports-page">
      <header className="reports-page-heading">
        <div>
          <p className="products-eyebrow">ANÁLISIS DE LA TIENDA</p>
          <h1>Reportes y estadísticas</h1>
          <p className="reports-period-caption">{periodLabel}</p>
        </div>
      </header>

      <section aria-label="Periodo del reporte" className="report-filter-panel">
        <div className="report-period-tabs" role="group" aria-label="Periodos rápidos">
          {[
            ['today', 'Hoy'],
            ['week', 'Esta semana'],
            ['month', 'Este mes'],
            ['custom', 'Personalizado'],
          ].map(([value, label]) => (
            <button
              aria-pressed={filter === value}
              className={`report-period-button${filter === value ? ' active' : ''}`}
              key={value}
              onClick={() => value === 'custom' ? applyRange(startDate, endDate, value) : selectPreset(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {filter === 'custom' && (
          <div className="report-date-range">
            <label>
              <span>Fecha inicial</span>
              <span className="report-date-input">
                <CalendarDays size={17} aria-hidden="true" />
                <input
                  aria-label="Fecha inicial del reporte"
                  max={endDate || undefined}
                  onChange={(event) => handleCustomDateChange('start', event.target.value)}
                  required
                  type="date"
                  value={startDate}
                />
              </span>
            </label>
            <label>
              <span>Fecha final</span>
              <span className="report-date-input">
                <CalendarDays size={17} aria-hidden="true" />
                <input
                  aria-label="Fecha final del reporte"
                  min={startDate || undefined}
                  onChange={(event) => handleCustomDateChange('end', event.target.value)}
                  required
                  type="date"
                  value={endDate}
                />
              </span>
            </label>
          </div>
        )}

        <button
          className="primary-button report-save-button"
          disabled={!summary || summaryState.loading}
          onClick={handleSaveReport}
          type="button"
        >
          <FilePlus2 size={18} aria-hidden="true" />
          Guardar reporte
        </button>
      </section>

      {summaryState.error && (
        <p className="products-feedback error-message" role="alert">{summaryState.error}</p>
      )}
      {savedState.error && (
        <p className="products-feedback error-message" role="alert">{savedState.error}</p>
      )}
      {notice && <p className="products-feedback success-message" role="status">{notice}</p>}

      {summaryState.loading && summary && (
        <p className="report-refreshing-state" role="status">Actualizando gráficas y estadísticas…</p>
      )}
      {summaryState.loading && !summary ? (
        <div className="report-loading-state" role="status">Cargando estadísticas del periodo…</div>
      ) : summary ? (
        <>
          <section aria-label="Indicadores del periodo" className="report-metrics-grid">
            <article className="report-metric-card">
              <span className="report-metric-icon"><ReceiptText size={20} aria-hidden="true" /></span>
              <span>Ventas realizadas</span>
              <strong>{numberFormatter.format(summary.sales)}</strong>
              <small>Transacciones del periodo</small>
            </article>
            <article className="report-metric-card">
              <span className="report-metric-icon"><Banknote size={20} aria-hidden="true" /></span>
              <span>Ingresos totales</span>
              <strong>{currencyFormatter.format(summary.revenue)}</strong>
              <small>Importe cobrado, después de descuentos</small>
            </article>
            <article className="report-metric-card">
              <span className="report-metric-icon"><Package size={20} aria-hidden="true" /></span>
              <span>Unidades vendidas</span>
              <strong>{numberFormatter.format(summary.units)}</strong>
              <small>Unidades en los detalles de venta</small>
            </article>
            <article className="report-metric-card">
              <span className="report-metric-icon"><BarChart3 size={20} aria-hidden="true" /></span>
              <span>Ticket promedio</span>
              <strong>{currencyFormatter.format(summary.averageTicket)}</strong>
              <small>Ingresos divididos entre ventas</small>
            </article>
          </section>

          <section aria-label="Ventas por categoría" className="report-category-grid">
            <article className="report-chart-panel">
              <header className="report-panel-heading">
                <div>
                  <h2>Distribución por categoría</h2>
                  <p>Unidades vendidas y porcentaje del total</p>
                </div>
                <Package size={19} aria-hidden="true" />
              </header>
              {summary.categories.length && summary.units ? (
                <CategoryDonut categories={summary.categories} units={summary.units} />
              ) : (
                <div className="report-empty-state compact"><Package size={22} aria-hidden="true" /><p>No hay ventas por categoría en este periodo.</p></div>
              )}
            </article>

            <article className="report-chart-panel">
              <header className="report-panel-heading">
                <div>
                  <h2>Comparación por categoría</h2>
                  <p>Unidades e ingresos después de descuentos</p>
                </div>
                <BarChart3 size={19} aria-hidden="true" />
              </header>
              {summary.categories.length && summary.units ? (
                <ol className="report-category-bars">
                  {summary.categories.map((category) => {
                    const color = getCategoryColor(category.category)
                    return (
                      <li
                        key={category.category}
                        style={{ '--category-color': color }}
                        title={`${category.category}: ${numberFormatter.format(category.quantity)} unidades · ${currencyFormatter.format(category.total)} · ${category.percentage}%`}
                      >
                        <div className="report-category-bar-label">
                          <span>{category.category}</span>
                          <strong>{numberFormatter.format(category.quantity)} ud.</strong>
                          <small>{currencyFormatter.format(category.total)}</small>
                        </div>
                        <div aria-hidden="true" className="report-bar-track">
                          <span
                            className="report-category-bar-fill"
                            style={{ width: `${maxCategoryQuantity ? Math.max(3, category.quantity / maxCategoryQuantity * 100) : 0}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <div className="report-empty-state compact"><BarChart3 size={22} aria-hidden="true" /><p>No hay ventas por categoría en este periodo.</p></div>
              )}
            </article>
          </section>

          <SalesAreaChart isSingleDay={isSingleDay} summary={summary} />

          <section className="report-visualizations-grid">
            <article className="report-chart-panel">
              <header className="report-panel-heading">
                <div>
                  <h2>Ventas por día</h2>
                  <p>Ingresos diarios y cantidad de ventas</p>
                </div>
                <BarChart3 size={19} aria-hidden="true" />
              </header>
              {summary.sales && summary.dailySales.length ? (
                <ol className="report-daily-chart">
                  {summary.dailySales.map((day) => (
                    <li className="report-daily-row" key={day.date}>
                      <div className="report-daily-label">
                        <strong>{formatShortDate(day.date)}</strong>
                        <span>{numberFormatter.format(day.sales)} ventas</span>
                      </div>
                      <div
                        aria-label={`${currencyFormatter.format(day.revenue)} de ingresos`}
                        className="report-bar-track"
                        role="img"
                      >
                        <span
                          className="report-bar-fill"
                          style={{ width: `${maxDailyRevenue ? Math.max(3, day.revenue / maxDailyRevenue * 100) : 0}%` }}
                        />
                      </div>
                      <strong className="report-daily-revenue">{currencyFormatter.format(day.revenue)}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="report-empty-state compact"><BarChart3 size={22} aria-hidden="true" /><p>Sin ventas en este periodo.</p></div>
              )}
            </article>

            <article className="report-chart-panel">
              <header className="report-panel-heading">
                <div>
                  <h2>Productos más vendidos</h2>
                  <p>Comparación por unidades vendidas</p>
                </div>
                <Package size={19} aria-hidden="true" />
              </header>
              {summary.rows.length ? (
                <ol className="report-product-chart">
                  {summary.rows.slice(0, 8).map((row, index) => (
                    <li
                      className="report-product-chart-row"
                      key={row.product}
                      title={`${row.product}: ${numberFormatter.format(row.quantity)} unidades · ${currencyFormatter.format(row.total)}`}
                    >
                      <div className="report-product-chart-label">
                        <span className="best-sellers-chart-rank">{index + 1}</span>
                        <span className="best-sellers-chart-name">{row.product}</span>
                        <strong>{numberFormatter.format(row.quantity)} <small>ud.</small></strong>
                      </div>
                      <div aria-hidden="true" className="report-bar-track">
                        <span
                          className="report-bar-fill"
                          style={{ width: `${maxProductQuantity ? Math.max(3, row.quantity / maxProductQuantity * 100) : 0}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="report-empty-state compact"><Package size={22} aria-hidden="true" /><p>Sin productos vendidos en este periodo.</p></div>
              )}
            </article>
          </section>

          <section className="report-details-grid">
            <article className="report-table-panel">
              <header className="report-panel-heading">
                <div>
                  <h2>Detalle por producto</h2>
                  <p>Ordenado de mayor a menor por unidades</p>
                </div>
              </header>
              {summary.rows.length ? (
                <>
                  <div className="products-table-wrap">
                    <table className="products-table reports-table">
                      <thead>
                        <tr>
                          <th scope="col">Producto</th>
                          <th scope="col">Unidades</th>
                          <th scope="col">Ventas</th>
                          <th scope="col">Ingresos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleProducts.map((row) => (
                          <tr key={row.product}>
                            <td>{row.product}</td>
                            <td>{numberFormatter.format(row.quantity)}</td>
                            <td>{numberFormatter.format(row.salesCount)}</td>
                            <td>{currencyFormatter.format(row.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {summary.rows.length > 10 && (
                    <button
                      className="report-show-more"
                      onClick={() => setShowAllProducts((shown) => !shown)}
                      type="button"
                    >
                      {showAllProducts ? 'Mostrar menos' : `Ver todos (${summary.rows.length})`}
                    </button>
                  )}
                </>
              ) : (
                <div className="report-empty-state compact"><Package size={22} aria-hidden="true" /><p>No hay productos para mostrar.</p></div>
              )}
            </article>

            <article className="report-payment-panel">
              <header className="report-panel-heading">
                <div>
                  <h2>Métodos de pago</h2>
                  <p>Ingresos y proporción del total cobrado</p>
                </div>
                <CreditCard size={19} aria-hidden="true" />
              </header>
              <div className="report-payment-list">
                {summary.paymentMethods.map((payment) => {
                  const option = paymentOptions[payment.method]
                  const Icon = option?.icon ?? Landmark
                  return (
                    <div className="report-payment-row" key={payment.method}>
                      <div className="report-payment-label">
                        <span className="report-payment-icon"><Icon size={17} aria-hidden="true" /></span>
                        <span>{option?.label ?? payment.method}</span>
                        <strong>{currencyFormatter.format(payment.revenue)}</strong>
                      </div>
                      <div aria-hidden="true" className="report-bar-track">
                        <span className="report-bar-fill" style={{ width: `${payment.percentage}%` }} />
                      </div>
                      <small>{payment.percentage}% · {numberFormatter.format(payment.sales)} ventas</small>
                    </div>
                  )
                })}
              </div>
            </article>
          </section>
        </>
      ) : (
        <div className="report-empty-state"><FileText size={25} aria-hidden="true" /><p>Selecciona un periodo válido para consultar el reporte.</p></div>
      )}

      <section className="saved-reports-panel">
        <header className="sales-summary-heading">
          <div>
            <h2>Reportes guardados</h2>
            <p>Consultas conservadas en este navegador</p>
          </div>
        </header>
        {savedState.reports.length ? (
          <div className="saved-reports-list">
            {savedState.reports.map((report) => (
              <button
                className={`saved-report-item${selectedSavedReport === report.id ? ' active' : ''}`}
                key={report.id}
                onClick={() => handleSelectSavedReport(report)}
                type="button"
              >
                <FileText size={19} aria-hidden="true" />
                <span>
                  <strong>Ventas · {formatDate(report.startDate)} – {formatDate(report.endDate)}</strong>
                  <small>
                    {numberFormatter.format(report.summary?.units ?? 0)} unidades ·{' '}
                    {currencyFormatter.format(report.summary?.revenue ?? 0)}
                  </small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="saved-reports-empty">Aún no hay reportes guardados.</p>
        )}
      </section>
    </section>
  )
}

export default ReportsPage
