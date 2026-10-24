import { apiGet, apiRequest } from './api';

export function getProfile(accessToken) {
  return apiGet('/auth/profile/', accessToken);
}

export function updateProfile(accessToken, formData) {
  return apiRequest('/auth/profile/', {
    method: 'PATCH',
    accessToken,
    body: formData,
  });
}
