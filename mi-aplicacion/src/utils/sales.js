import {
  getProducts,
  PRODUCTS_UPDATED_EVENT,
  PRODUCTS_STORAGE_KEY,
} from './dashboardData.js'
import { getSales, SALES_STORAGE_KEY } from './reports.js'

export const SALES_UPDATED_EVENT = 'mini-super:sales-updated'

function toCents(value, label) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} debe ser una cantidad válida.`)
  }
  return Math.round((amount + Number.EPSILON) * 100)
}

function fromCents(value) {
  return value / 100
}

export function registerSale({
  items,
  discount = 0,
  paymentMethod,
  amountReceived,
  paymentConfirmed,
  user,
  operationId,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Agrega al menos un producto al carrito.')
  }
  if (!user?.id || !String(user.username ?? '').trim()) {
    throw new Error('No se pudo identificar al usuario que registra la venta.')
  }
  if (!['efectivo', 'tarjeta', 'transferencia'].includes(paymentMethod)) {
    throw new Error('Selecciona un método de pago válido.')
  }
  if (!operationId) throw new Error('No se pudo identificar esta operación.')

  const existingSale = getSales().find((sale) => sale.operationId === operationId)
  if (existingSale) return existingSale

  const products = getProducts()
  const productById = new Map(products.map((product) => [String(product.id), product]))
  const requestedQuantities = new Map()

  for (const item of items) {
    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Todas las cantidades deben ser números enteros mayores que cero.')
    }
    const key = String(item.productId)
    requestedQuantities.set(key, (requestedQuantities.get(key) ?? 0) + quantity)
  }

  const saleItems = []
  let subtotalCents = 0
  for (const [productId, quantity] of requestedQuantities) {
    const product = productById.get(productId)
    if (!product) throw new Error('Uno de los productos ya no está en el inventario.')

    const stock = Number(product.stock ?? product.quantity)
    if (!Number.isInteger(stock) || stock < quantity) {
      throw new Error(`Inventario insuficiente para ${product.name || 'un producto'}.`)
    }

    const unitPriceCents = toCents(product.price, `El precio de ${product.name || 'un producto'}`)
    const lineSubtotalCents = unitPriceCents * quantity
    subtotalCents += lineSubtotalCents
    saleItems.push({
      productId: product.id,
      productName: String(product.name ?? 'Producto sin nombre'),
      quantity,
      unitPrice: fromCents(unitPriceCents),
      subtotal: fromCents(lineSubtotalCents),
      lineTotal: fromCents(lineSubtotalCents),
    })
  }

  const discountCents = toCents(discount, 'El descuento')
  if (discountCents > subtotalCents) {
    throw new Error('El descuento no puede ser mayor que el subtotal.')
  }
  const totalCents = subtotalCents - discountCents
  let receivedCents = null
  let changeCents = null

  if (paymentMethod === 'efectivo') {
    if (amountReceived === '' || amountReceived === null || amountReceived === undefined) {
      throw new Error('Ingresa el dinero recibido.')
    }
    receivedCents = toCents(amountReceived, 'El dinero recibido')
    if (receivedCents < totalCents) {
      throw new Error('El dinero recibido es insuficiente para cubrir el total.')
    }
    changeCents = receivedCents - totalCents
  } else if (!paymentConfirmed) {
    throw new Error('Confirma que el pago fue recibido antes de registrar la venta.')
  }

  let allocatedDiscountCents = 0
  saleItems.forEach((item, index) => {
    const lineSubtotalCents = toCents(item.subtotal, 'El subtotal')
    const lineDiscountCents = index === saleItems.length - 1
      ? discountCents - allocatedDiscountCents
      : Math.floor((discountCents * lineSubtotalCents) / subtotalCents)
    allocatedDiscountCents += lineDiscountCents
    item.lineTotal = fromCents(lineSubtotalCents - lineDiscountCents)
  })

  const updatedProducts = products.map((product) => {
    const quantity = requestedQuantities.get(String(product.id))
    if (!quantity) return product
    const stockField = product.stock !== undefined ? 'stock' : 'quantity'
    return { ...product, [stockField]: Number(product[stockField]) - quantity }
  })

  const createdAt = new Date().toISOString()
  const sale = {
    id: window.crypto.randomUUID(),
    operationId,
    number: `V-${createdAt.slice(0, 10).replaceAll('-', '')}-${window.crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    createdAt,
    date: createdAt,
    user: { id: user.id, username: String(user.username).trim() },
    items: saleItems,
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    total: fromCents(totalCents),
    paymentMethod,
    amountReceived: receivedCents === null ? null : fromCents(receivedCents),
    change: changeCents === null ? null : fromCents(changeCents),
  }

  const updatedSales = [sale, ...getSales()]
  const serializedProducts = window.localStorage.getItem(PRODUCTS_STORAGE_KEY)
  try {
    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updatedProducts))
    window.localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(updatedSales))
  } catch {
    if (serializedProducts === null) window.localStorage.removeItem(PRODUCTS_STORAGE_KEY)
    else window.localStorage.setItem(PRODUCTS_STORAGE_KEY, serializedProducts)
    throw new Error('No se pudo guardar la venta y actualizar el inventario.')
  }

  window.dispatchEvent(new Event(PRODUCTS_UPDATED_EVENT))
  window.dispatchEvent(new Event(SALES_UPDATED_EVENT))
  return sale
}