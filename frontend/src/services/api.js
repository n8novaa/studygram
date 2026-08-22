const API_BASE_URL = 'http://127.0.0.1:8000/api'

export async function apiRequest(path, options = {}, accessToken = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status}`

    try {
      const data = await response.json()
      errorMessage = data.detail || errorMessage
    } catch {
      // Response wasn't JSON.
    }

    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export function getRooms(accessToken = null) {
  return apiRequest('/rooms/', {}, accessToken)
}