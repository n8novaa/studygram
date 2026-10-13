import {
  apiGet,
  apiPost,
} from '../services/api'

const refreshRequests = new Map();

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
  if (refreshRequests.has(refreshToken)) {
    return refreshRequests.get(refreshToken);
  }

  const request = apiPost('/auth/token/refresh/', {
    refresh: refreshToken,
  }).finally(() => {
    refreshRequests.delete(refreshToken);
  });

  refreshRequests.set(refreshToken, request);
  return request;
}

/*
 * Retrieve the currently authenticated user.
 */
export async function getCurrentUser(accessToken) {
  return apiGet('/auth/me/', accessToken)
}

/* Revoke a refresh token on the server. */
export async function logoutUser(accessToken, refreshToken) {
  return apiPost(
    '/auth/logout/',
    { refresh: refreshToken },
    accessToken,
  )
}

/*
 * Request a password-reset email.
 */
export async function requestPasswordReset(username) {
  return apiPost('/auth/password-reset/', {
    username,
  });
}

/*
 * Submit a new password using the reset link.
 */
export async function confirmPasswordReset(
  uid,
  token,
  password,
) {
  return apiPost('/auth/password-reset/confirm/', {
    uid,
    token,
    password,
  });
}
