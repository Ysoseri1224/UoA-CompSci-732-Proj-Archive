import useAuthStore from '../store/authStore.js';

/**
 * Convenience hook for components that need auth state or actions.
 *
 * Returns a stable subset of the auth store so callers do not need to
 * import useAuthStore directly or know its internal shape.
 *
 * Usage:
 *   const { user, isAuthenticated, setAuth, clearAuth } = useAuth();
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return { user, accessToken, isAuthenticated, setAuth, clearAuth };
}
