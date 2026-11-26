const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`
).replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function getXsrfToken() {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith('XSRF-TOKEN='))

  if (!cookie) {
    throw new Error('No se pudo preparar la sesión segura. Inténtalo nuevamente.')
  }

  return decodeURIComponent(cookie.slice('XSRF-TOKEN='.length))
}

async function fetchWithCredentials(url, options) {
  try {
    return await fetch(url, { ...options, credentials: 'include' })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'No se pudo conectar con el servidor. Verifica que Laravel esté iniciado.',
        { cause: error },
      )
    }
    throw error
  }
}

async function fetchCsrfCookie() {
  const response = await fetchWithCredentials(`${API_BASE_URL}/sanctum/csrf-cookie`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new ApiError('No se pudo preparar la sesión segura.', response.status)
  }
}

async function readResponse(response) {
  if (response.status === 204) return null

  try {
    return await response.json()
  } catch {
    return null
  }
}

function responseErrorMessage(payload) {
  const validationMessage = payload?.errors
    ? Object.values(payload.errors).flat().find((message) => typeof message === 'string')
    : null

  return validationMessage || payload?.message || 'No se pudo completar la solicitud.'
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' }
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await fetchCsrfCookie()
    headers['X-XSRF-TOKEN'] = getXsrfToken()
  }

  const response = await fetchWithCredentials(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    signal,
  })
  const payload = await readResponse(response)

  if (!response.ok) {
    throw new ApiError(responseErrorMessage(payload), response.status)
  }

  return payload
}

export async function registerUser({
  username,
  email,
  password,
  confirmPassword,
  accountType,
  adminRegistrationCode,
}) {
  const body = {
    nombre: username,
    correo: email,
    password,
    password_confirmation: confirmPassword,
    account_type: accountType,
  }
  if (accountType === 'administrator') {
    body.admin_registration_code = adminRegistrationCode
  }

  return request('/api/register', {
    method: 'POST',
    body,
  })
}

export async function loginUser(email, password) {
  const response = await request('/api/login', {
    method: 'POST',
    body: { correo: email, password },
  })

  return response.user
}

export async function getCurrentUser() {
  try {
    const response = await request('/api/user')
    return response.user
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function logoutUser() {
  await request('/api/logout', { method: 'POST' })
}

export async function getUserCount() {
  const response = await request('/api/users/count')

  if (!Number.isInteger(response?.count) || response.count < 0) {
    throw new Error('El servidor devolvió un conteo de usuarios no válido.')
  }

  return response.count
}

export async function updateUserProfile(username) {
  const response = await request('/api/profile', {
    method: 'PATCH',
    body: { username },
  })

  return response.user
}

export async function updateAccountPreferences(preferences, photoDataUrl = null) {
  let body = preferences
  let method = 'PATCH'

  if (photoDataUrl) {
    if (!photoDataUrl.startsWith('data:image/')) {
      throw new Error('La fotografía seleccionada no tiene un formato de imagen válido.')
    }

    const imageResponse = await fetch(photoDataUrl)
    if (!imageResponse.ok) {
      throw new Error('No se pudo preparar la fotografía para guardarla.')
    }

    const formData = new FormData()
    const image = await imageResponse.blob()
    formData.append('photo', image, 'profile.webp')
    for (const key of ['theme', 'palette']) {
      if (Object.prototype.hasOwnProperty.call(preferences, key)) {
        formData.append(key, preferences[key])
      }
    }
    if (Object.prototype.hasOwnProperty.call(preferences, 'photoCrop')) {
      formData.append('photoCrop', JSON.stringify(preferences.photoCrop))
    }
    body = formData
    method = 'POST'
  }

  const response = await request('/api/profile/preferences', { method, body })
  return response.preferences
}

export async function removeProfilePhoto() {
  const response = await request('/api/profile/photo', { method: 'DELETE' })
  return response.preferences
}

export async function getStoreSettings() {
  const response = await request('/api/store-settings')
  return response.data
}

export async function reverseGeocodeAddress(latitude, longitude, signal) {
  const response = await request('/api/store-settings/reverse-geocode', {
    method: 'POST',
    body: { latitude, longitude },
    signal,
  })
  return response.data
}

export async function saveStoreSettings(settings) {
  const body = new FormData()
  body.append('storeName', settings.storeName)
  body.append('address', settings.address ?? '')
  body.append('phone', settings.phone ?? '')
  body.append('email', settings.email ?? '')
  body.append('ticketMessage', settings.ticketMessage ?? '')
  body.append('latitude', settings.latitude ?? '')
  body.append('longitude', settings.longitude ?? '')
  if (settings.logo) body.append('logo', settings.logo)

  const response = await request('/api/store-settings', {
    method: 'POST',
    body,
  })
  return response.data
}

export async function getProducts(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  const response = await request(`/api/products${query}`)
  return response.data
}

export async function getInventory() {
  const response = await request('/api/inventory')
  return response.data
}

export async function getInventoryMovements(page = 1, perPage = 15) {
  const query = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
  })
  return request(`/api/inventory/movements?${query}`)
}

export async function createInventoryMovement(movement) {
  const response = await request('/api/inventory/movements', {
    method: 'POST',
    body: movement,
  })
  return response.data
}

export async function createProduct(product) {
  const response = await request('/api/products', {
    method: 'POST',
    body: product,
  })
  return response.data
}

export async function updateProduct(productId, product) {
  const response = await request(`/api/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    body: product,
  })
  return response.data
}

export async function deleteProduct(productId) {
  await request(`/api/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  })
}

export async function getCategories() {
  const response = await request('/api/categories')
  return response.data
}

export async function createCategory(category) {
  const response = await request('/api/categories', {
    method: 'POST',
    body: category,
  })
  return response.data
}

export async function updateCategory(categoryId, category) {
  const response = await request(`/api/categories/${encodeURIComponent(categoryId)}`, {
    method: 'PUT',
    body: category,
  })
  return response.data
}

export async function deleteCategory(categoryId) {
  await request(`/api/categories/${encodeURIComponent(categoryId)}`, {
    method: 'DELETE',
  })
}

export async function getSalesRecords() {
  const response = await request('/api/sales')
  return response.data
}

export async function createSale(sale) {
  const response = await request('/api/sales', {
    method: 'POST',
    body: sale,
  })
  return response.data
}

export async function getDashboardData() {
  return request('/api/dashboard')
}

export async function getSalesReport(startDate, endDate) {
  const query = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  })
  const response = await request(`/api/reports/sales?${query}`)
  return response.summary
}

export async function getRoles() {
  const response = await request('/api/admin/roles')
  return response.data
}

export async function getManagedUsers() {
  const response = await request('/api/admin/users')
  return response.data
}

export async function createManagedUser(user) {
  const response = await request('/api/admin/users', {
    method: 'POST',
    body: user,
  })
  return response.data
}

export async function updateManagedUser(userId, user) {
  const response = await request(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: user,
  })
  return response.data
}

export async function getEmployees(search = '') {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  const response = await request(`/api/admin/employees${query}`)
  return response.data
}

export async function getEmployee(employeeId) {
  const response = await request(`/api/admin/employees/${encodeURIComponent(employeeId)}`)
  return response.data
}

export async function createEmployee(employee) {
  const response = await request('/api/admin/employees', {
    method: 'POST',
    body: employee,
  })
  return response.data
}

export async function updateEmployee(employeeId, employee) {
  const response = await request(`/api/admin/employees/${encodeURIComponent(employeeId)}`, {
    method: 'PATCH',
    body: employee,
  })
  return response.data
}

export async function resetEmployeePassword(employeeId, password) {
  return request(`/api/admin/employees/${encodeURIComponent(employeeId)}/password`, {
    method: 'POST',
    body: password,
  })
}
