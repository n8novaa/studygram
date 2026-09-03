import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import {
  getCurrentUser,
  login,
  refreshAccessToken,
} from './authService'


const AuthContext =
  createContext(null)


export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null)

  const [accessToken, setAccessToken] =
    useState(null)

  const [refreshToken, setRefreshToken] =
    useState(null)

  const [loading, setLoading] =
    useState(true)


  /*
   * Log in and establish the complete
   * authenticated application state.
   */
  async function loginUser(
    username,
    password,
  ) {
    try {
      const tokens =
        await login(
          username,
          password,
        )


      /*
       * We need the current user before
       * considering authentication complete.
       */
      const currentUser =
        await getCurrentUser(
          tokens.access,
        )


      /*
       * Only update application state after
       * all required authentication steps
       * have succeeded.
       */
      setAccessToken(
        tokens.access,
      )

      setRefreshToken(
        tokens.refresh,
      )

      setUser(
        currentUser,
      )


      localStorage.setItem(
        'refreshToken',
        tokens.refresh,
      )


      return currentUser

    } catch (error) {

      /*
       * Do not leave partially authenticated
       * state behind if login or user retrieval
       * fails.
       */
      setUser(null)
      setAccessToken(null)
      setRefreshToken(null)

      localStorage.removeItem(
        'refreshToken',
      )

      throw error
    }
  }


  /*
   * Restore an existing authenticated session
   * when the application starts.
   */
  async function restoreSession() {
    const storedRefreshToken =
      localStorage.getItem(
        'refreshToken',
      )


    if (!storedRefreshToken) {
      setLoading(false)
      return
    }


    try {
      const data =
        await refreshAccessToken(
          storedRefreshToken,
        )


      /*
       * SimpleJWT normally returns an access
       * token. If refresh-token rotation is
       * enabled, it may also return a new
       * refresh token.
       *
       * Preserve the new token when provided.
       */
      const newRefreshToken =
        data.refresh ||
        storedRefreshToken


      const currentUser =
        await getCurrentUser(
          data.access,
        )


      setAccessToken(
        data.access,
      )

      setRefreshToken(
        newRefreshToken,
      )

      setUser(
        currentUser,
      )


      /*
       * Keep localStorage synchronized with
       * the refresh token actually in use.
       */
      localStorage.setItem(
        'refreshToken',
        newRefreshToken,
      )

    } catch {
      /*
       * The refresh token is invalid,
       * expired, or the authenticated
       * session cannot be restored.
       */
      localStorage.removeItem(
        'refreshToken',
      )

      setAccessToken(null)
      setRefreshToken(null)
      setUser(null)

    } finally {
      setLoading(false)
    }
  }


  function logout() {
    localStorage.removeItem(
      'refreshToken',
    )

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
  return useContext(
    AuthContext,
  )
}