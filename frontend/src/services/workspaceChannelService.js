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

  let requestPath = endpoint;
  let allMessages = [];

  while (requestPath) {
    const data = await apiGet(requestPath, accessToken);

    // Support both paginated and non-paginated API responses.
    if (Array.isArray(data)) {
      allMessages = [...allMessages, ...data];
      break;
    }

    allMessages = [
      ...allMessages,
      ...(data?.results ?? []),
    ];

    // Follow the next page when one exists.
    if (data?.next) {
      const nextUrl = new URL(data.next, window.location.origin);
      requestPath = `${nextUrl.pathname.replace('/api', '')}${nextUrl.search}`;
    } else {
      requestPath = null;
    }
  }

  return allMessages;
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
