import { CalendarDays, FilePlus2, FileText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  buildSalesSummary,
  getSavedReports,
  getSales,
  REPORTS_STORAGE_KEY,
  REPORTS_UPDATED_EVENT,
  SALES_STORAGE_KEY,
  saveSalesReport,
} from '../utils/reports.js'
import { SALES_UPDATED_EVENT } from '../utils/sales.js'

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

function getInitialSavedReports() {
  try {
    return { reports: getSavedReports(), error: '' }
  } catch (error) {
    return {
      reports: [],
      error:
        error instanceof Error
          ? error.message
          : 'No se pudieron consultar los reportes guardados.',
    }
  }
}

function getInitialSales() {
  try {
    return { sales: getSales(), error: '' }
  } catch (error) {
    return {
      sales: [],
      error:
        error instanceof Error
          ? error.message
          : 'No se pudieron consultar las ventas.',
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

function ReportsPage() {
  const [salesState, setSalesState] = useState(getInitialSales)
  const [savedState, setSavedState] = useState(getInitialSavedReports)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const salesError = salesState.error

  const currentSummary = useMemo(
    () => selectedReport?.summary ?? null,
    [selectedReport],
  )

  useEffect(() => {
    function refreshStoredData(event) {
      if (event.type === 'storage' && event.key && event.key !== SALES_STORAGE_KEY) {
        if (event.key !== REPORTS_STORAGE_KEY) return
      }

      if (
        event.type === REPORTS_UPDATED_EVENT ||
        event.key === REPORTS_STORAGE_KEY ||
        event.key === null
      ) {
        setSavedState(getInitialSavedReports())
      }
      if (
        event.type === SALES_UPDATED_EVENT ||
        (event.type !== REPORTS_UPDATED_EVENT &&
          (event.key === SALES_STORAGE_KEY || event.key === null))
      ) {
        setSalesState(getInitialSales())
      }
    }

    window.addEventListener('storage', refreshStoredData)
    window.addEventListener(SALES_UPDATED_EVENT, refreshStoredData)
    window.addEventListener(REPORTS_UPDATED_EVENT, refreshStoredData)
    return () => {
      window.removeEventListener('storage', refreshStoredData)
      window.removeEventListener(SALES_UPDATED_EVENT, refreshStoredData)
      window.removeEventListener(REPORTS_UPDATED_EVENT, refreshStoredData)
    }
  }, [])

  function handleGenerate(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSelectedReport(null)

    if (!startDate || !endDate) {
      setError('Selecciona la fecha de inicio y la fecha de finalización.')
      return
    }
    if (startDate > endDate) {
      setError('La fecha de inicio no puede ser posterior a la fecha de finalización.')
      return
    }

    let currentSales
    try {
      currentSales = getSales()
      setSalesState({ sales: currentSales, error: '' })
    } catch (salesLoadError) {
      setError(
        salesLoadError instanceof Error
          ? salesLoadError.message
          : 'No se pudieron consultar las ventas.',
      )
      return
    }

    const report = {
      id: window.crypto.randomUUID(),
      type: 'sales',
      startDate,
      endDate,
      summary: buildSalesSummary(currentSales, startDate, endDate),
      savedAt: new Date().toISOString(),
    }

    try {
      setSavedState({ reports: saveSalesReport(report), error: '' })
      setSelectedReport(report)
      setNotice('El reporte se guardó correctamente para futuras consultas.')
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar el reporte.',
      )
    }
  }

  function handleSelectSavedReport(report) {
    setSelectedReport(report)
    setStartDate(report.startDate)
    setEndDate(report.endDate)
    setError('')
    setNotice('')
  }

  return (
    <section className="reports-page">
      <header className="reports-page-heading">
        <div>
          <p className="products-eyebrow">ANÁLISIS DE LA TIENDA</p>
          <h1>Reportes</h1>
        </div>
      </header>

      <form className="report-filters-card" onSubmit={handleGenerate}>
        <label className="report-filter-type">
          <span>Tipo de reporte</span>
          <select aria-label="Tipo de reporte" disabled value="sales">
            <option value="sales">Ventas</option>
          </select>
        </label>
        <div className="report-date-range">
          <label>
            <span>Rango de fechas · Inicio</span>
            <span className="report-date-input">
              <CalendarDays size={17} aria-hidden="true" />
              <input
                aria-label="Fecha de inicio"
                max={endDate || undefined}
                onChange={(event) => {
                  setStartDate(event.target.value)
                  setError('')
                  setNotice('')
                }}
                required
                type="date"
                value={startDate}
              />
            </span>
          </label>
          <label>
            <span>Rango de fechas · Finalización</span>
            <span className="report-date-input">
              <CalendarDays size={17} aria-hidden="true" />
              <input
                aria-label="Fecha de finalización"
                min={startDate || undefined}
                onChange={(event) => {
                  setEndDate(event.target.value)
                  setError('')
                  setNotice('')
                }}
                required
                type="date"
                value={endDate}
              />
            </span>
          </label>
        </div>
        <button className="primary-button report-save-button" type="submit">
          <FilePlus2 size={18} aria-hidden="true" />
          Guardar reporte
        </button>
      </form>

      {(error || savedState.error || salesError) && (
        <p className="products-feedback error-message" role="alert">
          {error || savedState.error || salesError}
        </p>
      )}
      {notice && (
        <p className="products-feedback success-message" role="status">
          {notice}
        </p>
      )}

      <section className="sales-summary-panel">
        <header className="sales-summary-heading">
          <div>
            <h2>Resumen de ventas</h2>
            <p>
              {selectedReport
                ? `${formatDate(selectedReport.startDate)} – ${formatDate(selectedReport.endDate)}`
                : 'Selecciona un rango y guarda el reporte.'}
            </p>
          </div>
        </header>

        {currentSummary ? (
          currentSummary.rows.length ? (
            <>
              {currentSummary.incompleteSales > 0 && (
                <p className="report-warning" role="status">
                  Se omitieron líneas incompletas de {currentSummary.incompleteSales}{' '}
                  venta(s), porque faltan datos de producto, cantidad o precio.
                </p>
              )}
              <div className="products-table-wrap">
                <table className="products-table reports-table">
                  <thead>
                    <tr>
                      <th scope="col">Producto</th>
                      <th scope="col">Cantidad vendida</th>
                      <th scope="col">Total obtenido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSummary.rows.map((row) => (
                      <tr key={row.product}>
                        <td>{row.product}</td>
                        <td>{row.quantity}</td>
                        <td>{currencyFormatter.format(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="report-totals">
                <span>
                  Unidades vendidas: <strong>{currentSummary.units}</strong>
                </span>
                <span>
                  Ingresos:{' '}
                  <strong>{currencyFormatter.format(currentSummary.revenue)}</strong>
                </span>
              </div>
            </>
          ) : (
            <div className="report-empty-state">
              <FileText size={25} aria-hidden="true" />
              <p>No existen ventas registradas para el periodo seleccionado.</p>
            </div>
          )
        ) : (
          <div className="report-empty-state">
            <FileText size={25} aria-hidden="true" />
            <p>Los resultados del reporte aparecerán aquí.</p>
          </div>
        )}
      </section>

      <section className="saved-reports-panel">
        <header className="sales-summary-heading">
          <div>
            <h2>Reportes guardados</h2>
            <p>Consultas conservadas para futuras consultas</p>
          </div>
        </header>
        {savedState.reports.length ? (
          <div className="saved-reports-list">
            {savedState.reports.map((report) => (
              <button
                className={`saved-report-item${selectedReport?.id === report.id ? ' active' : ''}`}
                key={report.id}
                onClick={() => handleSelectSavedReport(report)}
                type="button"
              >
                <FileText size={19} aria-hidden="true" />
                <span>
                  <strong>
                    Ventas · {formatDate(report.startDate)} – {formatDate(report.endDate)}
                  </strong>
                  <small>
                    {report.summary?.units ?? 0} unidades ·{' '}
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
