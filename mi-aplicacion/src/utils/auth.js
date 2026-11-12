const USERS_STORAGE_KEY = 'mini-super.users'
const SESSION_STORAGE_KEY = 'mini-super.session'
const PASSWORD_ITERATIONS = 310000

function readUsers() {
  const serializedUsers = window.localStorage.getItem(USERS_STORAGE_KEY)
  if (!serializedUsers) return []

  let users
  try {
    users = JSON.parse(serializedUsers)
  } catch {
    throw new Error('No se pudieron leer las cuentas guardadas en este navegador.')
  }

  if (!Array.isArray(users)) {
    throw new Error('El registro de cuentas guardado no es válido.')
  }

  return users
}

export function getRegisteredUserCount() {
  return readUsers().length
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password, salt) {
  const key = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: PASSWORD_ITERATIONS,
    },
    key,
    256,
  )
  return bytesToHex(new Uint8Array(derivedBits))
}

function passwordSalt() {
  const salt = new Uint8Array(16)
  window.crypto.getRandomValues(salt)
  return salt
}

function hexToBytes(hex) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null
  return new Uint8Array(hex.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)))
}

export async function registerUser({ username, email, password }) {
  const normalizedUsername = username.trim()
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedUsername || !normalizedEmail || !password) {
    throw new Error('Completa todos los campos.')
  }
  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Ingresa un correo electrónico válido.')
  }

  const users = readUsers()
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error('Ya existe una cuenta registrada con ese correo.')
  }

  const salt = passwordSalt()
  const passwordHash = await hashPassword(password, salt)
  const updatedUsers = readUsers()
  if (updatedUsers.some((user) => user.email === normalizedEmail)) {
    throw new Error('Ya existe una cuenta registrada con ese correo.')
  }

  updatedUsers.push({
    id: window.crypto.randomUUID(),
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash,
    salt: bytesToHex(salt),
    role: 'user',
  })

  try {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers))
  } catch {
    throw new Error('No se pudo guardar la cuenta en este navegador.')
  }
}

export async function authenticateUser(email, password) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !password) {
    throw new Error('Ingresa tu correo electrónico y contraseña.')
  }
  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Ingresa un correo electrónico válido.')
  }

  const user = readUsers().find((account) => account.email === normalizedEmail)
  if (!user || typeof user.salt !== 'string' || typeof user.passwordHash !== 'string') {
    throw new Error('El correo o la contraseña no son correctos.')
  }

  const salt = hexToBytes(user.salt)
  if (!salt) {
    throw new Error('El registro de la cuenta no es válido.')
  }

  const passwordHash = await hashPassword(password, salt)
  if (passwordHash !== user.passwordHash) {
    throw new Error('El correo o la contraseña no son correctos.')
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'user',
  }
}

export function getStoredSessionUser() {
  const serializedSession = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (!serializedSession) return null

  let session
  try {
    session = JSON.parse(serializedSession)
  } catch {
    throw new Error('La sesión guardada en este navegador no es válida.')
  }

  if (typeof session?.userId !== 'string') {
    throw new Error('La sesión guardada en este navegador no es válida.')
  }

  const user = readUsers().find((account) => account.id === session.userId)
  if (!user) return null

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'user',
  }
}

export function saveSession(userId) {
  try {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ userId }),
    )
  } catch {
    throw new Error('No se pudo guardar la sesión en este navegador.')
  }
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
}

export function isAdmin(user) {
  return user?.role === 'admin'
}
