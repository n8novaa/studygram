const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000/api'


/*
 * Build the full API URL.
 */
function buildUrl(path) {
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`
  }

  return `${API_BASE_URL}${path}`
}


/*
 * Extract the most useful error message from
 * a Django REST Framework response.
 */
function getErrorMessage(data, fallback) {
  if (!data) {
    return fallback
  }

  if (typeof data.detail === 'string') {
    return data.detail
  }

  if (typeof data.message === 'string') {
    return data.message
  }

  /*
   * DRF validation errors commonly look like:
   *
   * {
   *   name: ["This field is required."]
   * }
   */
  if (typeof data === 'object') {
    for (const value of Object.values(data)) {
      if (Array.isArray(value) && value.length > 0) {
        return String(value[0])
      }

      if (typeof value === 'string') {
        return value
      }
    }
  }

  return fallback
}


/*
 * Parse a response safely.
 *
 * Some endpoints, especially DELETE endpoints,
 * may return an empty response body.
 */
async function parseResponse(response) {
  const contentType =
    response.headers.get('content-type') || ''

  if (
    !contentType.includes('application/json')
  ) {
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}


/*
 * Common API request function.
 *
 * All frontend services should use this instead
 * of calling fetch() directly.
 */
export async function apiRequest(
  path,
  {
    method = 'GET',
    accessToken = null,
    body = undefined,
    headers = {},
  } = {},
) {
  const requestHeaders = {
    ...headers,
  }


  /*
   * Only set JSON content type when we are actually
   * sending a normal JSON body.
   *
   * This is important later for file uploads because
   * FormData must NOT receive a manually-set
   * Content-Type header.
   */
  if (
    body !== undefined &&
    !(body instanceof FormData) &&
    !requestHeaders['Content-Type']
  ) {
    requestHeaders['Content-Type'] =
      'application/json'
  }


  if (accessToken) {
    requestHeaders.Authorization =
      `Bearer ${accessToken}`
  }


  let requestBody = body


  if (
    body !== undefined &&
    !(body instanceof FormData) &&
    typeof body !== 'string'
  ) {
    requestBody = JSON.stringify(body)
  }


  let response

  try {
    response = await fetch(
      buildUrl(path),
      {
        method,
        headers: requestHeaders,
        body: requestBody,
      },
    )
  } catch {
    throw new Error(
      'Unable to connect to the StudyGram server.',
    )
  }


  const data =
    await parseResponse(response)


  if (!response.ok) {
    const message =
      getErrorMessage(
        data,
        `Request failed with status ${response.status}.`,
      )

    /*
     * Preserve the status code so callers can
     * distinguish authentication failures,
     * forbidden requests, not-found errors, etc.
     */
    const error = new Error(message)

    error.status = response.status
    error.data = data

    throw error
  }


  return data
}


/*
 * Convenience methods.
 *
 * These keep the service files readable while
 * still routing everything through apiRequest().
 */

export function apiGet(
  path,
  accessToken = null,
) {
  return apiRequest(path, {
    method: 'GET',
    accessToken,
  })
}


export function apiPost(
  path,
  body = undefined,
  accessToken = null,
) {
  return apiRequest(path, {
    method: 'POST',
    accessToken,
    body,
  })
}


export function apiPatch(
  path,
  body = undefined,
  accessToken = null,
) {
  return apiRequest(path, {
    method: 'PATCH',
    accessToken,
    body,
  })
}


export function apiPut(
  path,
  body = undefined,
  accessToken = null,
) {
  return apiRequest(path, {
    method: 'PUT',
    accessToken,
    body,
  })
}


export function apiDelete(
  path,
  accessToken = null,
) {
  return apiRequest(path, {
    method: 'DELETE',
    accessToken,
  })
}


/*
 * Download a binary file from the API and
 * trigger a browser save dialog.
 */
export async function apiDownload(
  path,
  accessToken,
  filename = 'download',
) {
  let response

  try {
    response = await fetch(
      buildUrl(path),
      {
        method: 'GET',
        headers: accessToken
          ? {
              Authorization:
                `Bearer ${accessToken}`,
            }
          : {},
      },
    )
  } catch {
    throw new Error(
      'Unable to connect to the StudyGram server.',
    )
  }


  if (!response.ok) {
    const data =
      await parseResponse(response)

    throw new Error(
      getErrorMessage(
        data,
        `Download failed with status ${response.status}.`,
      ),
    )
  }


  const blob =
    await response.blob()

  const objectUrl =
    URL.createObjectURL(blob)

  const link =
    document.createElement('a')

  link.href = objectUrl
  link.download = filename

  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(objectUrl)
}