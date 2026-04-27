import client from './client.js';
import { getRefreshToken } from '../utils/tokenUtils.js';

// ---------------------------------------------------------------------------
// Auth API — POST /api/auth/*
//
// Both register and login return the same shape (unified in backend PR #48):
//   { data: { accessToken, user } }
//
// Both functions below return:
//   { accessToken, user }
// ---------------------------------------------------------------------------

/**
 * Register a new account.
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @returns {{ accessToken: string, user: object }}
 */
export async function register(username, email, password) {
  const res = await client.post('/api/auth/register', { username, email, password });
  return {
    accessToken: res.data.data.accessToken,
    user: res.data.data.user,
  };
}

/**
 * Log in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {{ accessToken: string, user: object }}
 */
export async function login(email, password) {
  const res = await client.post('/api/auth/login', { email, password });
  return {
    accessToken: res.data.data.accessToken,
    user: res.data.data.user,
  };
}

/**
 * Invalidate the current session.
 * Reads the refresh token from localStorage automatically.
 * The access token itself expires naturally (15 min TTL).
 */
export async function logout() {
  const refreshToken = getRefreshToken();
  await client.post('/api/auth/logout', { refreshToken });
}

/**
 * Exchange a valid refresh token for a new access token.
 * Reads the refresh token from localStorage automatically.
 * Called by the auth store's auto-refresh logic (added in PR 4).
 * @returns {{ accessToken: string }}
 */
export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  const res = await client.post('/api/auth/refresh', { refreshToken });
  return {
    accessToken: res.data.data.accessToken,
  };
}
