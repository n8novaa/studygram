import {
  apiGet,
  apiPost,
} from '../services/api'

/*
 * Authenticate a user and obtain JWT tokens.
 */
export async function login(username, password) {
  return apiPost('/auth/token/', {
    username,
    password,
  })
}

/*
 * Register a new user.
 */
export async function registerUser(username, email, password) {
  return apiPost('/auth/register/', {
    username,
    email,
    password,
  })
}

/*
 * Exchange a refresh token for a new access token.
 */
export async function refreshAccessToken(refreshToken) {
  return apiPost('/auth/token/refresh/', {
    refresh: refreshToken,
  })
}

/*
 * Retrieve the currently authenticated user.
 */
export async function getCurrentUser(accessToken) {
  return apiGet('/auth/me/', accessToken)
}