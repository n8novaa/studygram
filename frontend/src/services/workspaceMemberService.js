
import {
  apiGet,
  apiPost,
  apiDelete,
} from './api'


/*
 * Get all members of a workspace.
 */
export async function getWorkspaceMembers(
  accessToken,
  workspaceId,
) {
  return apiGet(
    `/workspaces/${workspaceId}/members/`,
    accessToken,
  )
}


/*
 * Promote a member to administrator.
 */
export async function promoteWorkspaceMember(
  accessToken,
  workspaceId,
  userId,
) {
  return apiPost(
    `/workspaces/${workspaceId}/members/${userId}/promote/`,
    undefined,
    accessToken,
  )
}


/*
 * Demote an administrator to a normal member.
 */
export async function demoteWorkspaceMember(
  accessToken,
  workspaceId,
  userId,
) {
  return apiPost(
    `/workspaces/${workspaceId}/members/${userId}/demote/`,
    undefined,
    accessToken,
  )
}


/*
 * Remove a member from the workspace.
 */
export async function removeWorkspaceMember(
  accessToken,
  workspaceId,
  userId,
) {
  return apiDelete(
    `/workspaces/${workspaceId}/members/${userId}/remove/`,
    accessToken,
  )
}

