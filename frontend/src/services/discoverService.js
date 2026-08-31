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

export async function discoverWorkspaces(accessToken) {
  const response = await fetch(
    '/api/workspaces/discover/',
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