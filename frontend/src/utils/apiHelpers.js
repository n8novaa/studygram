/*
 * Normalize a Django REST Framework list response.
 *
 * Supports both paginated and plain array responses.
 */
export function normalizeList(data) {
  if (Array.isArray(data)) {
    return data
  }

  return data?.results ?? []
}
