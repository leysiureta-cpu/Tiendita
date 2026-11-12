import { useCallback, useMemo, useState } from 'react'
import AuthContext from './AuthContext.js'
import {
  authenticateUser,
  clearSession,
  getStoredSessionUser,
  registerUser,
  saveSession,
} from '../utils/auth.js'

function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredSessionUser)

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

  const value = useMemo(
    () => ({ user, register, login, logout }),
    [user, register, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
