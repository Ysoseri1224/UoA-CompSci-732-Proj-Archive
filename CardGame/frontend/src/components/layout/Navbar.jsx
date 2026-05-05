import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../api/authApi.js';
import { useAuth } from '../../hooks/useAuth.js';

function Navbar() {
  const { user, isAuthenticated, clearAuth } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      // Tell the backend to invalidate the refresh token in Redis.
      // authApi.logout() reads the refresh token from localStorage automatically.
      await logout();
    } catch {
      // If the logout API call fails (e.g. network error or already expired),
      // still clear local auth so the user is not stuck in a logged-in state.
    }
    clearAuth();
    navigate('/');
  }

  return (
    <nav>
      <Link to="/">Home</Link>
      {' | '}
      <Link to="/leaderboard">Leaderboard</Link>

      {isAuthenticated ? (
        <>
          {' | '}
          <Link to="/lobby">Lobby</Link>
          {' | '}
          {/* Link to the logged-in user's own profile page */}
          <Link to={`/profile/${user?.id}`}>Profile</Link>
          {' | '}
          <span>{user?.username}</span>
          {' | '}
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </>
      ) : (
        <>
          {' | '}
          <Link to="/login">Login</Link>
          {' | '}
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
}

export default Navbar;
