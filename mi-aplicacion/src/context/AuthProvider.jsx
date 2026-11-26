import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import AuthContext from './AuthContext.js'
import {
  getUserPreferences,
  DEFAULT_USER_PREFERENCES,
} from '../utils/auth.js'
import { applyAppearance } from '../utils/appearance.js'
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  removeProfilePhoto,
  registerUser,
  updateAccountPreferences,
  updateUserProfile,
} from '../utils/api.js'

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const hydrateAuthenticatedUser = useCallback(async (authenticatedUser) => {
    let preferences = DEFAULT_USER_PREFERENCES
    let canMigrateLocalPreferences = true
    try {
      preferences = getUserPreferences(authenticatedUser)
    } catch (error) {
      canMigrateLocalPreferences = false
      setAuthError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las preferencias de esta cuenta.',
      )
    }

    setUser({ ...authenticatedUser, preferences })
    if (
      !canMigrateLocalPreferences ||
      authenticatedUser.preferences !== null && authenticatedUser.preferences !== undefined
    ) {
      return
    }

    try {
      const photoDataUrl = typeof preferences.profilePhoto === 'string' &&
        preferences.profilePhoto.startsWith('data:image/')
        ? preferences.profilePhoto
        : null
      const savedPreferences = await updateAccountPreferences(preferences, photoDataUrl)
      setUser((current) => current?.id === authenticatedUser.id
        ? { ...current, preferences: savedPreferences }
        : current)
    } catch (error) {
      setAuthError(error instanceof Error
        ? `No se pudieron migrar las preferencias al servidor. ${error.message}`
        : 'No se pudieron migrar las preferencias al servidor.')
    }
  }, [])

  useEffect(() => {
    let active = true

    getCurrentUser()
      .then(async (authenticatedUser) => {
        if (active && authenticatedUser) {
          await hydrateAuthenticatedUser(authenticatedUser)
        }
      })
      .catch((error) => {
        if (active) {
          setAuthError(
            error instanceof Error
              ? error.message
              : 'No se pudo recuperar la sesión del servidor.',
          )
        }
      })
      .finally(() => {
        if (active) setAuthLoading(false)
      })

    return () => {
      active = false
    }
  }, [hydrateAuthenticatedUser])

  useLayoutEffect(() => {
    applyAppearance(user?.preferences)
    if (user?.preferences?.theme !== 'system') return undefined

    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => applyAppearance(user.preferences)
    colorScheme.addEventListener('change', handleSystemThemeChange)
    return () => colorScheme.removeEventListener('change', handleSystemThemeChange)
  }, [user?.preferences])

  const register = useCallback(async (details) => {
    setAuthError('')
    return registerUser(details)
  }, [])

  const login = useCallback(async (email, password) => {
    const authenticatedUser = await loginUser(email, password)
    setAuthError('')
    await hydrateAuthenticatedUser(authenticatedUser)
  }, [hydrateAuthenticatedUser])

  const logout = useCallback(async () => {
    try {
      await logoutUser()
      setUser(null)
      setAuthError('')
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'No se pudo cerrar la sesión.',
      )
    }
  }, [])

  const updatePreferences = useCallback(async (preferences) => {
    if (!user) throw new Error('Inicia sesión para personalizar tu cuenta.')
    const savedPreferences = await updateAccountPreferences(preferences)
    setUser((current) => ({ ...current, preferences: savedPreferences }))
    setAuthError('')
    return savedPreferences
  }, [user])

  const saveProfilePhoto = useCallback(async ({ dataUrl, crop }) => {
    if (!user) throw new Error('Inicia sesión para personalizar tu cuenta.')
    const preferences = await updateAccountPreferences({ photoCrop: crop }, dataUrl)
    setUser((current) => ({ ...current, preferences }))
    setAuthError('')
    return preferences
  }, [user])

  const deleteProfilePhoto = useCallback(async () => {
    if (!user) throw new Error('Inicia sesión para personalizar tu cuenta.')
    const preferences = await removeProfilePhoto()
    setUser((current) => ({ ...current, preferences }))
    setAuthError('')
    return preferences
  }, [user])

  const updateProfile = useCallback(async (username) => {
    if (!user) throw new Error('Inicia sesión para actualizar tu perfil.')
    const updatedUser = await updateUserProfile(username)
    setUser((current) => ({
      ...current,
      ...updatedUser,
      preferences: updatedUser.preferences ?? current.preferences,
    }))
    return updatedUser
  }, [user])

  const value = useMemo(
    () => ({
      user,
      authLoading,
      authError,
      register,
      login,
      logout,
      updatePreferences,
      saveProfilePhoto,
      deleteProfilePhoto,
      updateProfile,
    }),
    [
      user,
      authLoading,
      authError,
      register,
      login,
      logout,
      updatePreferences,
      saveProfilePhoto,
      deleteProfilePhoto,
      updateProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
