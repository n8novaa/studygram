import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  apiRequest,
  apiDownload,
} from './api'

import { normalizeList } from '../utils/apiHelpers'


function buildQuery(params) {
  const searchParams =
    new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      searchParams.set(key, value)
    }
  }

  const query =
    searchParams.toString()

  return query ? `?${query}` : ''
}


/*
 * List folders in a workspace.
 *
 * Omit parentId for root-level folders.
 */
export async function getWorkspaceFolders(
  accessToken,
  workspaceId,
  parentId = null,
) {
  const query = buildQuery(
    parentId
      ? { parent: parentId }
      : {},
  )

  const data = await apiGet(
    `/workspaces/${workspaceId}/folders/${query}`,
    accessToken,
  )

  return normalizeList(data)
}


/*
 * Create a folder in a workspace.
 */
export async function createWorkspaceFolder(
  accessToken,
  workspaceId,
  { name, parent = null },
) {
  const body = { name }

  if (parent) {
    body.parent = parent
  }

  return apiPost(
    `/workspaces/${workspaceId}/folders/create/`,
    body,
    accessToken,
  )
}


/*
 * Update a folder.
 */
export async function updateWorkspaceFolder(
  accessToken,
  workspaceId,
  folderId,
  data,
) {
  return apiPatch(
    `/workspaces/${workspaceId}/folders/${folderId}/`,
    data,
    accessToken,
  )
}


/*
 * Delete a folder.
 */
export async function deleteWorkspaceFolder(
  accessToken,
  workspaceId,
  folderId,
) {
  return apiDelete(
    `/workspaces/${workspaceId}/folders/${folderId}/`,
    accessToken,
  )
}


/*
 * List files in a workspace.
 *
 * Omit folderId for root-level files.
 */
export async function getWorkspaceFiles(
  accessToken,
  workspaceId,
  folderId = null,
) {
  const query = buildQuery(
    folderId
      ? { folder: folderId }
      : {},
  )

  const data = await apiGet(
    `/workspaces/${workspaceId}/files/${query}`,
    accessToken,
  )

  return normalizeList(data)
}


/*
 * Upload a file to a workspace.
 */
export async function uploadWorkspaceFile(
  accessToken,
  workspaceId,
  { name, uploaded_file, folder = null },
) {
  const formData = new FormData()

  formData.append('name', name)
  formData.append(
    'uploaded_file',
    uploaded_file,
  )

  if (folder) {
    formData.append('folder', folder)
  }

  return apiRequest(
    `/workspaces/${workspaceId}/files/upload/`,
    {
      method: 'POST',
      accessToken,
      body: formData,
    },
  )
}


/*
 * Update a file's metadata.
 */
export async function updateWorkspaceFile(
  accessToken,
  workspaceId,
  fileId,
  data,
) {
  return apiPatch(
    `/workspaces/${workspaceId}/files/${fileId}/`,
    data,
    accessToken,
  )
}


/*
 * Delete a file.
 */
export async function deleteWorkspaceFile(
  accessToken,
  workspaceId,
  fileId,
) {
  return apiDelete(
    `/workspaces/${workspaceId}/files/${fileId}/`,
    accessToken,
  )
}


/*
 * Download a file.
 */
export async function downloadWorkspaceFile(
  accessToken,
  workspaceId,
  fileId,
  filename,
) {
  return apiDownload(
    `/workspaces/${workspaceId}/files/${fileId}/download/`,
    accessToken,
    filename,
  )
}
