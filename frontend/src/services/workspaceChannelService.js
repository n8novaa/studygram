import {
  apiGet,
  apiGetAll,
  apiPost,
  apiPatch,
  apiDelete,
} from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.DEV
    ? 'http://127.0.0.1:8000/api'
    : '/api'
);

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

export async function updateChannelMessage(
  accessToken,
  workspaceId,
  channelId,
  messageId,
  body
) {
  return apiPatch(
    `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/`,
    { body },
    accessToken
  );
}

export async function addChannelMessageReaction(
  accessToken,
  workspaceId,
  channelId,
  messageId,
  emoji
) {
  return apiPost(
    `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/reactions/`,
    { emoji },
    accessToken
  );
}

export async function removeChannelMessageReaction(
  accessToken,
  workspaceId,
  channelId,
  messageId
) {
  return apiDelete(
    `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/reactions/`,
    accessToken
  );
}

/*
 * Get all messages for a specific channel.
 * Handles Django REST Framework pagination.
 */
export async function getChannelMessages(
  accessToken,
  workspaceId,
  channelId
) {
  const endpoint =
    `/workspaces/${workspaceId}/channels/${channelId}/messages/`;
  return apiGetAll(endpoint, accessToken);
}

export async function markChannelMessagesViewed(accessToken, workspaceId, channelId, messageId) {
  return apiPost(
    `/workspaces/${workspaceId}/channels/${channelId}/read-position/`,
    { message_id: messageId },
    accessToken,
  );
}

export async function connectWorkspaceChannel(
  accessToken,
  workspaceId,
  channelId,
) {
  const { ticket } = await apiPost(
    `/workspaces/${workspaceId}/channels/${channelId}/messages/ws-ticket/`,
    {},
    accessToken,
  );
  const apiUrl = new URL(API_BASE_URL, window.location.origin);
  const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const apiPath = apiUrl.pathname.replace(/\/?api\/?$/, '').replace(/\/$/, '');
  const socketUrl = new URL(
    `${apiPath}/ws/workspaces/${workspaceId}/channels/${channelId}/messages/`,
    `${protocol}//${apiUrl.host}`,
  );
  socketUrl.searchParams.set('ticket', ticket);
  socketUrl.searchParams.set('presence', '1');
  return new WebSocket(socketUrl);
}

/*
 * Send a message to a channel.
 */
export async function sendChannelMessage(
  accessToken,
  workspaceId,
  channelId,
  body,
  replyTo = null
) {
  return apiPost(
    `/workspaces/${workspaceId}/channels/${channelId}/messages/`,
    {
      body,
      ...(replyTo ? { reply_to: replyTo } : {}),
    },
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
