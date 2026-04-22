import { Navigate } from 'react-router-dom';

// Guards a route so only authenticated users can access it.
// In this PR we check for a token in localStorage as a simple proxy for "logged in".
// This will be replaced with a proper authStore check in PR 4.
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    // No token found — redirect to the login page.
    // `replace` prevents the protected URL from being added to browser history,
    // so the back button won't return the user to a page they can't access.
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;
