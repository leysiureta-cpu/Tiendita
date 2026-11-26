const LEGACY_USERS_STORAGE_KEY = 'mini-super.users'
const USER_PREFERENCES_STORAGE_KEY = 'mini-super.user-preferences'

export const DEFAULT_USER_PREFERENCES = {
  theme: 'light',
  palette: 'red',
  profilePhoto: null,
  photoCrop: null,
}

function normalizePreferences(preferences = {}) {
  return {
    ...DEFAULT_USER_PREFERENCES,
    ...preferences,
    theme: ['light', 'dark', 'system'].includes(preferences.theme)
      ? preferences.theme
      : DEFAULT_USER_PREFERENCES.theme,
    palette: [
      'red', 'blue', 'purple', 'green', 'pink', 'orange', 'gray', 'turquoise', 'yellow',
    ].includes(preferences.palette)
      ? preferences.palette
      : DEFAULT_USER_PREFERENCES.palette,
    profilePhoto: typeof preferences.profilePhoto === 'string'
      ? preferences.profilePhoto
      : null,
  }
}

function readSavedPreferences() {
  const serializedPreferences = window.localStorage.getItem(USER_PREFERENCES_STORAGE_KEY)
  if (!serializedPreferences) return {}

  let preferences
  try {
    preferences = JSON.parse(serializedPreferences)
  } catch {
    throw new Error('No se pudieron leer las preferencias guardadas en este navegador.')
  }

  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    throw new Error('El registro de preferencias guardado no es válido.')
  }

  return preferences
}

function readLegacyPreferences(email) {
  const serializedUsers = window.localStorage.getItem(LEGACY_USERS_STORAGE_KEY)
  if (!serializedUsers) return {}

  let users
  try {
    users = JSON.parse(serializedUsers)
  } catch {
    throw new Error('No se pudieron leer las preferencias antiguas de esta cuenta.')
  }

  if (!Array.isArray(users)) {
    throw new Error('El registro local de cuentas no es válido.')
  }

  const account = users.find(
    (item) => typeof item?.email === 'string' &&
      item.email.trim().toLowerCase() === email.trim().toLowerCase(),
  )

  return account?.preferences && typeof account.preferences === 'object'
    ? account.preferences
    : {}
}

export function getUserPreferences(user) {
  if (!user?.id || typeof user.email !== 'string') {
    throw new Error('No se pudo identificar la cuenta para cargar sus preferencias.')
  }

  if (user.preferences && typeof user.preferences === 'object' && !Array.isArray(user.preferences)) {
    return normalizePreferences(user.preferences)
  }

  const savedPreferences = readSavedPreferences()[String(user.id)]
  if (savedPreferences && (typeof savedPreferences !== 'object' || Array.isArray(savedPreferences))) {
    throw new Error('Las preferencias guardadas de esta cuenta no son válidas.')
  }

  return normalizePreferences({
    ...readLegacyPreferences(user.email),
    ...savedPreferences,
  })
}

export function saveUserPreferences(user, preferences) {
  if (!user?.id || typeof user.email !== 'string') {
    throw new Error('No se pudo identificar la cuenta para guardar sus preferencias.')
  }

  const allPreferences = readSavedPreferences()
  const nextPreferences = normalizePreferences({
    ...getUserPreferences(user),
    ...preferences,
  })
  allPreferences[String(user.id)] = nextPreferences

  try {
    window.localStorage.setItem(
      USER_PREFERENCES_STORAGE_KEY,
      JSON.stringify(allPreferences),
    )
  } catch {
    throw new Error('No se pudieron guardar las preferencias en este navegador.')
  }

  return nextPreferences
}

export function isAdmin(user) {
  return user?.role === 'admin'
}

export function getRoleLabel(user) {
  if (typeof user?.roleName === 'string') return user.roleName
  if (user?.role === 'admin') return 'Administrador'
  if (user?.role === 'cashier') return 'Cajero'
  return 'Usuario'
}
