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
      data.visibility?.[0] ||
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
      data.visibility?.[0] ||
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


/*
 * Join a workspace.
 *
 * Public workspace:
 *     Creates membership immediately.
 *
 * Private workspace:
 *     Creates a pending join request.
 */
export async function joinWorkspace(
  accessToken,
  workspaceId,
) {
  const response = await fetch(
    `${API_BASE_URL}/workspaces/${workspaceId}/join/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.detail || 'Failed to join workspace',
    )
  }

  return data
}


/*
 * Get pending join requests for a workspace.
 *
 * Only workspace admins should be able to
 * successfully call this endpoint.
 */
export async function getJoinRequests(
  accessToken,
  workspaceId,
) {
  const response = await fetch(
    `${API_BASE_URL}/workspaces/${workspaceId}/join-requests/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.detail || 'Failed to load join requests',
    )
  }

  return data
}


/*
 * Approve a pending join request.
 */
export async function approveJoinRequest(
  accessToken,
  workspaceId,
  requestId,
) {
  const response = await fetch(
    `${API_BASE_URL}/workspaces/${workspaceId}/join-requests/${requestId}/approve/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.detail || 'Failed to approve join request',
    )
  }

  return data
}


/*
 * Reject a pending join request.
 */
export async function rejectJoinRequest(
  accessToken,
  workspaceId,
  requestId,
) {
  const response = await fetch(
    `${API_BASE_URL}/workspaces/${workspaceId}/join-requests/${requestId}/reject/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.detail || 'Failed to reject join request',
    )
  }

  return data
}

export async function getDiscoveredWorkspaces(accessToken) {
  const response = await fetch(
    `${API_BASE_URL}/workspaces/discover/`,
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
      data.detail || 'Failed to load workspaces',
    )
  }

  return data.results ?? data
}