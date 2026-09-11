async function handleResponse(response) {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.detail ||
      data.error ||
      'Failed to load workspaces.',
    )
  }

  return data
}

export async function discoverWorkspaces(accessToken, search = '') {
  const params = new URLSearchParams()

  if (search.trim()) {
    params.set('search', search.trim())
  }

  const queryString = params.toString()

  const response = await fetch(
    `/api/workspaces/discover/${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  return handleResponse(response)
}