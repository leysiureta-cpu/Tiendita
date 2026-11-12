export const SALES_STORAGE_KEY = 'mini-super.sales'
export const REPORTS_STORAGE_KEY = 'mini-super.reports'
export const REPORTS_UPDATED_EVENT = 'mini-super:reports-updated'

function readStoredArray(key, description) {
  const serialized = window.localStorage.getItem(key)
  if (!serialized) return []

  let value
  try {
    value = JSON.parse(serialized)
  } catch {
    throw new Error(`No se pudieron leer ${description} guardados.`)
  }

  if (!Array.isArray(value)) {
    throw new Error(`El registro de ${description} guardado no es válido.`)
  }
  return value
}

export function getSales() {
  return readStoredArray(SALES_STORAGE_KEY, 'las ventas')
}

export function getSavedReports() {
  return readStoredArray(REPORTS_STORAGE_KEY, 'los reportes')
}

function getSaleDate(sale) {
  const dateValue = sale.date ?? sale.createdAt ?? sale.timestamp
  if (typeof dateValue !== 'string' && typeof dateValue !== 'number') return ''

  if (typeof dateValue === 'string') {
    const datePart = dateValue.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getSaleItems(sale) {
  if (Array.isArray(sale.items)) return sale.items
  if (Array.isArray(sale.products)) return sale.products
  if (Array.isArray(sale.lines)) return sale.lines
  if (sale.productName || sale.name || sale.product?.name) return [sale]
  return []
}

function getItemName(item) {
  return String(item.productName ?? item.name ?? item.product?.name ?? '').trim()
}

function getItemAmount(item, quantity) {
  const total = Number(item.lineTotal ?? item.total)
  if (Number.isFinite(total)) return total

  const unitPrice = Number(item.unitPrice ?? item.price ?? item.product?.price)
  if (Number.isFinite(unitPrice)) return unitPrice * quantity
  return null
}

function getSaleQuantity(item) {
  const quantity = Number(item.quantity ?? item.qty)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null
}

export function buildSalesSummary(sales, startDate, endDate) {
  const totalsByProduct = new Map()
  let incompleteSales = 0

  for (const sale of sales) {
    if (!sale || typeof sale !== 'object') continue
    const saleDate = getSaleDate(sale)
    if (!saleDate || saleDate < startDate || saleDate > endDate) continue

    let saleWasIncomplete = false
    for (const item of getSaleItems(sale)) {
      if (!item || typeof item !== 'object') {
        saleWasIncomplete = true
        continue
      }
      const name = getItemName(item)
      const quantity = getSaleQuantity(item)
      const amount = quantity === null ? null : getItemAmount(item, quantity)
      if (!name || quantity === null || amount === null) {
        saleWasIncomplete = true
        continue
      }

      const current = totalsByProduct.get(name) ?? { product: name, quantity: 0, total: 0 }
      current.quantity += quantity
      current.total += amount
      totalsByProduct.set(name, current)
    }

    if (saleWasIncomplete) incompleteSales += 1
  }

  const rows = [...totalsByProduct.values()].sort((a, b) =>
    a.product.localeCompare(b.product, 'es', { sensitivity: 'base' }),
  )

  return {
    rows,
    units: rows.reduce((total, row) => total + row.quantity, 0),
    revenue: rows.reduce((total, row) => total + row.total, 0),
    incompleteSales,
  }
}

export function saveSalesReport(report) {
  const reports = getSavedReports()
  const updatedReports = [report, ...reports]
  try {
    window.localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updatedReports))
  } catch {
    throw new Error('No se pudo guardar el reporte en este navegador.')
  }
  window.dispatchEvent(new Event(REPORTS_UPDATED_EVENT))
  return updatedReports
}
