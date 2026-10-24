import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  apiGetAll,
} from './api'

/*
 * Get workspaces that the authenticated user is a member of.
 */
export async function getWorkspaces(accessToken) {
  return apiGetAll('/workspaces/', accessToken)
}

export function getRecentActivity(accessToken, page = 1, pageSize = 25, view = 'active') {
  return apiGet(
    `/workspaces/recent-activity/?page=${page}&page_size=${pageSize}&view=${view}`,
    accessToken,
  )
}

/*
 * Get a single workspace.
 */
export async function getWorkspace(accessToken, workspaceId) {
  return apiGet(`/workspaces/${workspaceId}/`, accessToken)
}

/*
 * Create a workspace.
 */
export async function createWorkspace(accessToken, workspaceData) {
  return apiPost('/workspaces/', workspaceData, accessToken)
}

/*
 * Update an existing workspace.
 */
export async function updateWorkspace(accessToken, workspaceId, workspaceData) {
  return apiPatch(`/workspaces/${workspaceId}/`, workspaceData, accessToken)
}

/*
 * Delete a workspace.
 */
export async function deleteWorkspace(accessToken, workspaceId) {
  return apiDelete(`/workspaces/${workspaceId}/`, accessToken)
}

/*
 * Join a workspace (direct for public, pending request for private).
 */
export async function joinWorkspace(accessToken, workspaceId) {
  return apiPost(`/workspaces/${workspaceId}/join/`, undefined, accessToken)
}

/*
 * Get pending join requests for a workspace (admin only).
 */
export async function getJoinRequests(accessToken, workspaceId) {
  const data = await apiGet(`/workspaces/${workspaceId}/join-requests/`, accessToken)
  return data?.results ?? data ?? []
}

/*
 * Approve a pending join request.
 */
export async function approveJoinRequest(accessToken, workspaceId, requestId) {
  return apiPost(
    `/workspaces/${workspaceId}/join-requests/${requestId}/approve/`,
    undefined,
    accessToken,
  )
}

/*
 * Reject a pending join request.
 */
export async function rejectJoinRequest(accessToken, workspaceId, requestId) {
  return apiPost(
    `/workspaces/${workspaceId}/join-requests/${requestId}/reject/`,
    undefined,
    accessToken,
  )
}

/*
 * Create a workspace invitation link / token.
 */
export async function createWorkspaceInvitation(accessToken, workspaceId, data = {}) {
  return apiPost(
    `/workspaces/${workspaceId}/invitations/create/`,
    data,
    accessToken,
  )
}

/*
 * Accept an invitation using its token.
 */
export async function acceptInvitation(accessToken, token) {
  return apiPost(
    `/workspaces/invitations/${token}/accept/`,
    undefined,
    accessToken,
  )
}

/*
 * Get publicly discoverable workspaces.
 */
export async function getDiscoveredWorkspaces(accessToken, search = '') {
  const query = search.trim()
  const endpoint = query
    ? `/workspaces/discover/?search=${encodeURIComponent(query)}`
    : '/workspaces/discover/'

  return apiGetAll(endpoint, accessToken)
}
