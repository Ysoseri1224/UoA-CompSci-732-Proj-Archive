// Helpers for reading and writing the access token in localStorage.
// Centralising the key name here means we only need to change it in one place.
//
// NOTE: PrivateRoute (PR 2) currently reads localStorage.getItem('token') directly.
// That will be replaced with authStore.isAuthenticated in PR 4; until then both
// must use the same key — 'token'.

const TOKEN_KEY = 'token';

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
