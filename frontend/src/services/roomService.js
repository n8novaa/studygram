import { apiGet, apiGetAll, apiPost, apiDelete } from './api';

/*
 * Get all study discussion rooms, with optional search query.
 */
export async function getRooms(accessToken, query = '') {
  const endpoint = query
    ? `/rooms/?q=${encodeURIComponent(query)}`
    : '/rooms/';
  return apiGetAll(endpoint, accessToken);
}

/*
 * Get single room details with participants.
 */
export async function getRoomDetail(accessToken, roomId) {
  return apiGet(`/rooms/${roomId}/`, accessToken);
}

/*
 * Create a new study room.
 */
export async function createRoom(accessToken, { name, topic_name, description }) {
  return apiPost(
    '/rooms/',
    {
      name: name.trim(),
      topic_name: topic_name.trim(),
      description: (description || '').trim(),
    },
    accessToken,
  );
}

/*
 * Delete a study room (host only).
 */
export async function deleteRoom(accessToken, roomId) {
  return apiDelete(`/rooms/${roomId}/`, accessToken);
}

/*
 * Get messages inside a room.
 */
export async function getRoomMessages(accessToken, roomId) {
  const data = await apiGet(`/rooms/${roomId}/messages/`, accessToken);
  const messages = data?.results ?? data ?? [];
  return Array.isArray(messages) ? [...messages].reverse() : [];
}

/*
 * Post a message inside a room.
 */
export async function sendRoomMessage(accessToken, roomId, body) {
  return apiPost(
    `/rooms/${roomId}/messages/`,
    { body: body.trim() },
    accessToken,
  );
}

/*
 * Delete a message (author only).
 */
export async function deleteMessage(accessToken, messageId) {
  return apiDelete(`/messages/${messageId}/`, accessToken);
}

/*
 * Get all available study topics.
 */
export async function getTopics(accessToken) {
  return apiGetAll('/topics/', accessToken);
}
