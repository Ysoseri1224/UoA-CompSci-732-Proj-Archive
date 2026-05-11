import axios from 'axios';
import { getToken } from '../utils/tokenUtils.js';

// Central axios instance used by every API service in this project.
// All backend requests go through this client so that auth headers,
// base URL, and error handling are configured in one place.
const client = axios.create({
  // Use relative path so all requests go through the Vite proxy (/api -> backend).
  // VITE_API_BASE_URL is only needed for production builds without a proxy.
  baseURL: import.meta.env.PROD ? (import.meta.env.VITE_API_BASE_URL || '') : '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach the JWT access token to every outgoing request.
// ---------------------------------------------------------------------------
client.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — normalise error shape for callers.
//
// AUTO-REFRESH NOTE (PR 4 TODO):
//   Automatic token refresh on 401 is intentionally NOT implemented here.
//   Reason: authApi.js imports this client, so client.js cannot import
//   authApi.js without creating a circular dependency.
//   The solution is to inject a refresh callback from authStore after it is
//   created in PR 4.  The pattern will be:
//
//     import { useAuthStore } from '../store/authStore.js';
//     client.interceptors.response.use(null, async (error) => {
//       if (error.response?.status === 401) {
//         const refreshed = await useAuthStore.getState().refreshAccessToken();
//         if (refreshed) return client.request(error.config);
//         useAuthStore.getState().clearAuth();
//       }
//       return Promise.reject(error);
//     });
//
//   For now, 401 responses are simply re-thrown so page-level code can handle
//   them (e.g. redirect to /login after a failed auth check).
// ---------------------------------------------------------------------------
client.interceptors.response.use(
  // Pass successful responses through unchanged.
  (response) => response,

  // Normalise error so callers can always read error.message.
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    // Attach a clean message to the error so UI code doesn't have to dig into
    // the axios response structure.
    error.message = message;
    return Promise.reject(error);
  }
);

export default client;
