import { Navigate } from 'react-router-dom';

const TOKEN_KEY = 'token';

// Guards a route so only authenticated users can access it.
// Checks for a token in localStorage as a simple proxy for "logged in".
// Will be replaced with a proper authStore check once the auth store is in place.
function PrivateRoute({ children }) {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    // No token found — redirect to the login page.
    // `replace` prevents the protected URL from being added to browser history,
    // so the back button won't return the user to a page they can't access.
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;
