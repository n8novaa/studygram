import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from './api'


/*
 * Get workspaces that the authenticated user
 * is a member of.
 */
export async function getWorkspaces(
  accessToken,
) {
  const data = await apiGet(
    '/workspaces/',
    accessToken,
  )

  /*
   * Django REST Framework may return either:
   *
   * {
   *   results: [...]
   * }
   *
   * or a plain array, depending on pagination.
   */
  return data?.results ?? data ?? []
}


/*
 * Get a single workspace.
 */
export async function getWorkspace(
  accessToken,
  workspaceId,
) {
  return apiGet(
    `/workspaces/${workspaceId}/`,
    accessToken,
  )
}


/*
 * Create a workspace.
 */
export async function createWorkspace(
  accessToken,
  workspaceData,
) {
  return apiPost(
    '/workspaces/',
    workspaceData,
    accessToken,
  )
}


/*
 * Update an existing workspace.
 */
export async function updateWorkspace(
  accessToken,
  workspaceId,
  workspaceData,
) {
  return apiPatch(
    `/workspaces/${workspaceId}/`,
    workspaceData,
    accessToken,
  )
}


/*
 * Delete a workspace.
 */
export async function deleteWorkspace(
  accessToken,
  workspaceId,
) {
  return apiDelete(
    `/workspaces/${workspaceId}/`,
    accessToken,
  )
}


/*
 * Join a workspace.
 *
 * Public workspace:
 *     Membership is created immediately.
 *
 * Private workspace:
 *     A pending join request is created.
 */
export async function joinWorkspace(
  accessToken,
  workspaceId,
) {
  return apiPost(
    `/workspaces/${workspaceId}/join/`,
    undefined,
    accessToken,
  )
}


/*
 * Get pending join requests for a workspace.
 *
 * Only workspace admins should be able
 * to successfully access this endpoint.
 *
 * Always returns an array regardless of
 * whether the backend response is paginated.
 */
export async function getJoinRequests(
  accessToken,
  workspaceId,
) {
  const data = await apiGet(
    `/workspaces/${workspaceId}/join-requests/`,
    accessToken,
  )

  return data?.results ?? data ?? []
}


/*
 * Approve a pending join request.
 */
export async function approveJoinRequest(
  accessToken,
  workspaceId,
  requestId,
) {
  return apiPost(
    `/workspaces/${workspaceId}/join-requests/${requestId}/approve/`,
    undefined,
    accessToken,
  )
}


/*
 * Reject a pending join request.
 */
export async function rejectJoinRequest(
  accessToken,
  workspaceId,
  requestId,
) {
  return apiPost(
    `/workspaces/${workspaceId}/join-requests/${requestId}/reject/`,
    undefined,
    accessToken,
  )
}


/*
 * Get publicly discoverable workspaces.
 */
export async function getDiscoveredWorkspaces(
  accessToken,
) {
  const data = await apiGet(
    '/workspaces/discover/',
    accessToken,
  )

  return data?.results ?? data ?? []
}