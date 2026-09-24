import { apiGet } from './api';

export async function discoverWorkspaces(accessToken, search = '') {
  const query = search.trim();
  const endpoint = query
    ? `/workspaces/discover/?search=${encodeURIComponent(query)}`
    : '/workspaces/discover/';

  const data = await apiGet(endpoint, accessToken);
  return Array.isArray(data) ? data : data?.results ?? [];
}