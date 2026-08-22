import { createContext, useContext, useEffect, useState } from 'react'
import {
  getCurrentUser,
  login,
  refreshAccessToken,
} from './authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loginUser(username, password) {
    const tokens = await login(username, password)

    setAccessToken(tokens.access)
    setRefreshToken(tokens.refresh)

    localStorage.setItem('refreshToken', tokens.refresh)

    const currentUser = await getCurrentUser(tokens.access)

    setUser(currentUser)

    return currentUser
  }

  async function restoreSession() {
    const storedRefreshToken = localStorage.getItem('refreshToken')

    if (!storedRefreshToken) {
      setLoading(false)
      return
    }

    try {
      const data = await refreshAccessToken(storedRefreshToken)

      setAccessToken(data.access)
      setRefreshToken(storedRefreshToken)

      const currentUser = await getCurrentUser(data.access)

      setUser(currentUser)
    } catch {
      localStorage.removeItem('refreshToken')
      setAccessToken(null)
      setRefreshToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('refreshToken')
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
  }

  useEffect(() => {
    restoreSession()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        loading,
        loginUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}