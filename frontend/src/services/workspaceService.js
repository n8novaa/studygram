const API_BASE_URL = 'http://127.0.0.1:8000/api'

export async function getWorkspaces(accessToken) {
  const response = await fetch(`${API_BASE_URL}/workspaces/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to load workspaces')
  }

  return data.results ?? data
}

export async function getWorkspace(accessToken, workspaceId) {
  const response = await fetch(
    `${API_BASE_URL}/workspaces/${workspaceId}/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.detail || 'Failed to load workspace',
    )
  }

  return data
}

export async function createWorkspace(accessToken, workspaceData) {
  const response = await fetch(`${API_BASE_URL}/workspaces/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workspaceData),
  })

  const data = await response.json()

  if (!response.ok) {
    const message =
      data.detail ||
      data.name?.[0] ||
      data.description?.[0] ||
      'Failed to create workspace'

    throw new Error(message)
  }

  return data
}

export async function updateWorkspace(
  accessToken,
  workspaceId,
  workspaceData,
) {
  const response = await fetch(
    `${API_BASE_URL}/workspaces/${workspaceId}/`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workspaceData),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    const message =
      data.detail ||
      data.name?.[0] ||
      data.description?.[0] ||
      'Failed to update workspace'

    throw new Error(message)
  }

  return data
}

export async function deleteWorkspace(accessToken, workspaceId) {
  const response = await fetch(
    `${API_BASE_URL}/workspaces/${workspaceId}/`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!response.ok) {
    let data = {}

    try {
      data = await response.json()
    } catch {
      // DELETE may return an empty response.
    }

    throw new Error(
      data.detail || 'Failed to delete workspace',
    )
  }
}