import { getRegisteredUserCount } from './auth.js'
import { getSales } from './reports.js'

export const PRODUCTS_STORAGE_KEY = 'mini-super.products'
export const PRODUCTS_UPDATED_EVENT = 'mini-super:products-updated'
const PRODUCTS_INITIALIZED_STORAGE_KEY = 'mini-super.products-initialized'

const initialProducts = [
  { id: '001', name: 'Coca-Cola 600 ml', category: 'Bebidas', price: 18, stock: 350 },
  { id: '002', name: 'Pepsi 600 ml', category: 'Bebidas', price: 17, stock: 250 },
  { id: '003', name: 'Agua Ciel 1 litro', category: 'Bebidas', price: 14, stock: 400 },
  { id: '004', name: 'Jugo Jumex 500 ml', category: 'Bebidas', price: 16, stock: 200 },
  { id: '005', name: 'Sabritas Originales', category: 'Botanas', price: 18, stock: 280 },
  { id: '006', name: 'Doritos Nacho', category: 'Botanas', price: 19, stock: 220 },
  { id: '007', name: 'Takis Fuego', category: 'Botanas', price: 17, stock: 300 },
  { id: '008', name: 'Galletas Oreo', category: 'Botanas', price: 16, stock: 180 },
  { id: '009', name: 'Leche entera 1 litro', category: 'Lácteos', price: 27, stock: 150 },
  { id: '010', name: 'Yogur natural', category: 'Lácteos', price: 22, stock: 120 },
  { id: '011', name: 'Queso panela', category: 'Lácteos', price: 45, stock: 100 },
  { id: '012', name: 'Pan blanco', category: 'Panadería', price: 42, stock: 140 },
  { id: '013', name: 'Pan dulce', category: 'Panadería', price: 12, stock: 200 },
  { id: '014', name: 'Galletas Marías', category: 'Panadería', price: 15, stock: 250 },
  { id: '015', name: 'Bolillo', category: 'Panadería', price: 3, stock: 50 },
]

export function getProducts() {
  const serializedProducts = window.localStorage.getItem(PRODUCTS_STORAGE_KEY)
  const initialized =
    window.localStorage.getItem(PRODUCTS_INITIALIZED_STORAGE_KEY) === 'true'
  let products = []

  if (serializedProducts) {
    try {
      products = JSON.parse(serializedProducts)
    } catch {
      throw new Error('No se pudieron leer los productos guardados.')
    }
  }

  if (!Array.isArray(products)) {
    throw new Error('El registro de productos guardado no es válido.')
  }

  if (products.length > 0) {
    if (!initialized) {
      window.localStorage.setItem(PRODUCTS_INITIALIZED_STORAGE_KEY, 'true')
    }
    return products
  }

  if (initialized) return products

  try {
    products = initialProducts.map((product) => ({ ...product }))
    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products))
    window.localStorage.setItem(PRODUCTS_INITIALIZED_STORAGE_KEY, 'true')
  } catch {
    throw new Error('No se pudieron cargar los productos iniciales en este navegador.')
  }
  window.dispatchEvent(new Event(PRODUCTS_UPDATED_EVENT))
  return products
}

export function saveProducts(products) {
  if (!Array.isArray(products)) {
    throw new Error('La lista de productos no es válida.')
  }

  try {
    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products))
    window.localStorage.setItem(PRODUCTS_INITIALIZED_STORAGE_KEY, 'true')
  } catch {
    throw new Error('No se pudieron guardar los productos en este navegador.')
  }

  window.dispatchEvent(new Event(PRODUCTS_UPDATED_EVENT))
}

export function getProductsCount() {
  return getProducts().length
}

export function getDashboardMetrics() {
  try {
    const inventory = getProducts()
    const sales = getSales()
    const today = new Date().toLocaleDateString('sv-SE')
    const salesToday = sales.filter((sale) => {
      const date = new Date(sale.createdAt ?? sale.date)
      return !Number.isNaN(date.getTime()) && date.toLocaleDateString('sv-SE') === today
    })
    const bestSellers = new Map()

    for (const sale of sales) {
      for (const item of sale.items ?? sale.products ?? sale.lines ?? []) {
        const name = String(item.productName ?? item.name ?? item.product?.name ?? '').trim()
        const quantity = Number(item.quantity ?? item.qty)
        if (!name || !Number.isFinite(quantity) || quantity <= 0) continue
        bestSellers.set(name, (bestSellers.get(name) ?? 0) + quantity)
      }
    }

    return {
      products: inventory.length,
      inventory,
      users: getRegisteredUserCount(),
      salesToday: salesToday.length,
      revenueToday: salesToday.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0),
      bestSellers: [...bestSellers.entries()]
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3),
      error: '',
    }
  } catch (error) {
    return {
      products: null,
      inventory: [],
      users: null,
      salesToday: null,
      revenueToday: null,
      bestSellers: [],
      error:
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los datos del panel.',
    }
  }
}
