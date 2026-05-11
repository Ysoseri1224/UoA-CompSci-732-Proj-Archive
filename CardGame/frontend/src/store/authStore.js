import { create } from 'zustand';
import {
  getToken,
  setToken,
  clearToken,
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
} from '../utils/tokenUtils.js';
import { audioManager } from '../utils/audioManager.js';

// ---------------------------------------------------------------------------
// JWT helpers — decode payload and check expiry without an external library.
// JWTs are base64url-encoded. atob() handles standard base64, so we replace
// the url-safe characters before decoding.
// ---------------------------------------------------------------------------

function parseJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return true;
  // exp is in seconds; Date.now() is in milliseconds
  return Date.now() >= payload.exp * 1000;
}

// ---------------------------------------------------------------------------
// Auth store
//
// State
//   user            — { id, username } decoded from the JWT, or null
//   accessToken     — the current JWT access token string, or null
//   refreshToken    — the refresh token string, or null
//   isAuthenticated — true when a non-expired access token is present
//
// Actions
//   setAuth(user, accessToken, refreshToken?)
//     Called after a successful login or register response.
//     Persists both tokens to localStorage via tokenUtils.
//
//   clearAuth()
//     Called on logout or when a token refresh fails.
//     Removes tokens from localStorage and resets all state.
//
//   restoreAuth()
//     Called once at app startup (in main.jsx).
//     Reads the stored access token, checks expiry, and either restores
//     the session or clears stale tokens.
//     Note: if the access token is expired but a refresh token exists,
//     the user will need to log in again. Silent token refresh on startup
//     is deferred to the axios interceptor layer (PR 5 / client.js TODO).
// ---------------------------------------------------------------------------

const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  setAuth: (user, accessToken, refreshToken) => {
    setToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    set({
      user,
      accessToken,
      // If caller did not supply a refreshToken, keep the one already in localStorage
      refreshToken: refreshToken ?? getRefreshToken(),
      isAuthenticated: true,
    });
  },

  clearAuth: () => {
    clearToken();
    clearRefreshToken();
    audioManager.stopBGM();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  restoreAuth: () => {
    const token = getToken();

    if (!token || isTokenExpired(token)) {
      // Stale or missing token — clean up and stay logged out
      clearToken();
      clearRefreshToken();
      audioManager.stopBGM();
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      return;
    }

    // Token is present and still valid — restore session from localStorage
    const payload = parseJwtPayload(token);
    const refreshToken = getRefreshToken();

    set({
      user: { id: payload.userId, username: payload.username },
      accessToken: token,
      refreshToken,
      isAuthenticated: true,
    });
  },
}));

export default useAuthStore;
