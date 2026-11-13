import { useCallback, useEffect, useMemo, useState } from 'react'
import AuthContext from './AuthContext.js'
import {
  authenticateUser,
  clearSession,
  getStoredSessionUser,
  registerUser,
  saveUserPreferences,
  saveSession,
} from '../utils/auth.js'
import { applyAppearance } from '../utils/appearance.js'

function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredSessionUser)

  useEffect(() => {
    applyAppearance(user?.preferences)
    if (user?.preferences?.theme !== 'system') return undefined

    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => applyAppearance(user.preferences)
    colorScheme.addEventListener('change', handleSystemThemeChange)
    return () => colorScheme.removeEventListener('change', handleSystemThemeChange)
  }, [user?.preferences])

  const register = useCallback(async (details) => {
    return registerUser(details)
  }, [])

  const login = useCallback(async (email, password) => {
    const authenticatedUser = await authenticateUser(email, password)
    saveSession(authenticatedUser.id)
    setUser(authenticatedUser)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const updatePreferences = useCallback((preferences) => {
    if (!user) throw new Error('Inicia sesión para personalizar tu cuenta.')
    const savedPreferences = saveUserPreferences(user.id, preferences)
    setUser((current) => ({ ...current, preferences: savedPreferences }))
    return savedPreferences
  }, [user])

  const value = useMemo(
    () => ({ user, register, login, logout, updatePreferences }),
    [user, register, login, logout, updatePreferences],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
