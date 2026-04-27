// Helpers for reading and writing auth tokens in localStorage.
// Centralising the key names here means we only need to change them in one place.

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

/** Return the stored access token, or null if none exists. */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/** Persist the access token to localStorage. */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Remove the access token from localStorage (called on logout or auth failure). */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Return the stored refresh token, or null if none exists. */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Persist the refresh token to localStorage. */
export function setRefreshToken(token) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

/** Remove the refresh token from localStorage. */
export function clearRefreshToken() {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
