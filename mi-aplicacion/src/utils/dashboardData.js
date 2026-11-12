import { getRegisteredUserCount } from './auth.js'

export const PRODUCTS_STORAGE_KEY = 'mini-super.products'
export const PRODUCTS_UPDATED_EVENT = 'mini-super:products-updated'

export function getProducts() {
  const serializedProducts = window.localStorage.getItem(PRODUCTS_STORAGE_KEY)
  if (!serializedProducts) return []

  let products
  try {
    products = JSON.parse(serializedProducts)
  } catch {
    throw new Error('No se pudieron leer los productos guardados.')
  }

  if (!Array.isArray(products)) {
    throw new Error('El registro de productos guardado no es válido.')
  }

  return products
}

export function saveProducts(products) {
  if (!Array.isArray(products)) {
    throw new Error('La lista de productos no es válida.')
  }

  try {
    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products))
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
    return {
      products: getProductsCount(),
      users: getRegisteredUserCount(),
      error: '',
    }
  } catch (error) {
    return {
      products: null,
      users: null,
      error:
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los datos del panel.',
    }
  }
}
