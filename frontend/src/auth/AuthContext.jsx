import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import {
  getCurrentUser,
  login,
  logoutUser as revokeRefreshToken,
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

      // Rotation invalidates the old token immediately, so persist the
      // replacement before the follow-up /me request can fail transiently.
      localStorage.setItem(
        'refreshToken',
        newRefreshToken,
      )


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

    } catch (error) {
      /* Clear only tokens the API explicitly rejects. Keep them after
       * transient network/server failures so a reload can retry. */
      if ([400, 401, 403].includes(error?.status)) {
        localStorage.removeItem('refreshToken')
      }

      setAccessToken(null)
      setRefreshToken(null)
      setUser(null)

    } finally {
      setLoading(false)
    }
  }


  async function logout() {
    const tokenToRevoke = refreshToken;

    try {
      if (accessToken && tokenToRevoke) {
        await revokeRefreshToken(accessToken, tokenToRevoke);
      }
    } finally {
      clearSession();
    }
  }

  function clearSession() {
    localStorage.removeItem(
      'refreshToken',
    )

    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
  }

  function updateUser(updates) {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      return {
        ...currentUser,
        ...updates,
        ...(updates.profile
          ? { profile: { ...currentUser.profile, ...updates.profile } }
          : {}),
      };
    });
  }


  useEffect(() => {
    restoreSession()
  }, [])

  useEffect(() => {
    function handleTokenRefresh(event) {
      const tokens = event.detail;
      if (!tokens?.access) return;
      setAccessToken(tokens.access);
      if (tokens.refresh) {
        setRefreshToken(tokens.refresh);
        localStorage.setItem('refreshToken', tokens.refresh);
      }
    }

    function handleExpiredSession() {
      localStorage.removeItem('refreshToken');
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
    }

    window.addEventListener('studygram:auth-token-refreshed', handleTokenRefresh);
    window.addEventListener('studygram:auth-session-expired', handleExpiredSession);
    return () => {
      window.removeEventListener('studygram:auth-token-refreshed', handleTokenRefresh);
      window.removeEventListener('studygram:auth-session-expired', handleExpiredSession);
    };
  }, [])


  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        loading,
        loginUser,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}


// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(
    AuthContext,
  )
}
