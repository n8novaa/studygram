import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from './api';

/*
 * Get all channels in a workspace.
 */
export async function getWorkspaceChannels(accessToken, workspaceId) {
  const data = await apiGet(`/workspaces/${workspaceId}/channels/`, accessToken);
  return Array.isArray(data) ? data : data?.results ?? [];
}

/*
 * Create a new channel in a workspace (Admin only).
 */
export async function createWorkspaceChannel(accessToken, workspaceId, channelData) {
  return apiPost(`/workspaces/${workspaceId}/channels/`, channelData, accessToken);
}

/*
 * Get single channel details.
 */
export async function getWorkspaceChannel(accessToken, workspaceId, channelId) {
  return apiGet(`/workspaces/${workspaceId}/channels/${channelId}/`, accessToken);
}

/*
 * Update a channel (name, description) (Admin only).
 */
export async function updateWorkspaceChannel(accessToken, workspaceId, channelId, channelData) {
  return apiPatch(`/workspaces/${workspaceId}/channels/${channelId}/`, channelData, accessToken);
}

/*
 * Delete a channel (Admin only).
 */
export async function deleteWorkspaceChannel(accessToken, workspaceId, channelId) {
  return apiDelete(`/workspaces/${workspaceId}/channels/${channelId}/`, accessToken);
}

/*
 * Get all messages for a specific channel.
 */
export async function getChannelMessages(accessToken, workspaceId, channelId) {
  const data = await apiGet(
    `/workspaces/${workspaceId}/channels/${channelId}/messages/`,
    accessToken
  );
  return Array.isArray(data) ? data : data?.results ?? [];
}

/*
 * Send a message to a channel.
 */
export async function sendChannelMessage(accessToken, workspaceId, channelId, body) {
  return apiPost(
    `/workspaces/${workspaceId}/channels/${channelId}/messages/`,
    { body },
    accessToken
  );
}

/*
 * Delete a message from a channel (Message author only).
 */
export async function deleteChannelMessage(accessToken, workspaceId, channelId, messageId) {
  return apiDelete(
    `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/`,
    accessToken
  );
}
