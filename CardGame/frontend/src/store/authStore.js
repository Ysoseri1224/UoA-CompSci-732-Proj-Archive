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

/**
 * `true` if the token will expire within `skewMs` (default 30 s). Used by
 * pre-emptive refresh paths (socket reconnect_attempt) to decide whether to
 * burn one round-trip before retrying.
 */
function isTokenAboutToExpire(token, skewMs = 30_000) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() + skewMs >= payload.exp * 1000;
}

export { isTokenExpired, isTokenAboutToExpire, parseJwtPayload };

// ---------------------------------------------------------------------------
// Module-scoped refresh singleton.
// All callers (REST 401 interceptor, socket reconnect_attempt, socket
// auth:expired handler) flow through `refreshAccessToken()`.  The in-flight
// promise is shared so a burst of concurrent failures triggers exactly one
// `POST /api/auth/refresh` round-trip and every caller resolves with the
// same new token.
// ---------------------------------------------------------------------------
let refreshInFlight = /** @type {Promise<string>|null} */ (null);

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

const useAuthStore = create((set, get) => ({
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

  /**
   * Exchange the stored refresh token for a fresh access token.
   *
   * Resolves with the new access token string on success.
   * Rejects (and calls `clearAuth`) if the refresh token is missing,
   * expired, or rejected by the server.
   *
   * Concurrent invocations share a single in-flight promise so we never
   * fire two refresh requests in parallel — important because the server
   * may rotate refresh tokens and only the winning request gets the new
   * one.
   */
  refreshAccessToken: async () => {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      const rt = get().refreshToken ?? getRefreshToken();
      if (!rt) throw new Error('No refresh token available');

      // Plain fetch instead of axios to avoid the circular dep with client.js.
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Refresh failed with status ${res.status}`);
      }

      const json = await res.json();
      const newAccess = json?.data?.accessToken;
      if (!newAccess) throw new Error('Refresh response missing accessToken');

      // Update both localStorage and reactive state. Re-derive `user` from
      // the freshly-issued JWT so a server-side username change propagates.
      const payload = parseJwtPayload(newAccess);
      setToken(newAccess);
      set({
        accessToken: newAccess,
        user: payload?.userId ? { id: payload.userId, username: payload.username } : get().user,
        isAuthenticated: true,
      });

      return newAccess;
    })()
      .catch((err) => {
        // On terminal failure, clean up so the user is bounced back to /login
        // by `PrivateRoute`. Re-throw so the caller can react too.
        clearToken();
        clearRefreshToken();
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        throw err;
      })
      .finally(() => {
        refreshInFlight = null;
      });

    return refreshInFlight;
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
