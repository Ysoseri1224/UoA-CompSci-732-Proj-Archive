import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';

// Guards a route so only authenticated users can access it.
// Reads isAuthenticated from the auth store, which is restored from
// localStorage on app startup via restoreAuth() in main.jsx.
function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    // Not logged in — redirect to login.
    // `replace` prevents the protected URL from being added to browser history,
    // so the back button won't return the user to a page they can't access.
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;
