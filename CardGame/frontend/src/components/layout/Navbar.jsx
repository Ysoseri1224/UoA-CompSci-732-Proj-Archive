import { Link } from 'react-router-dom';

// Application navigation bar.
// This is a static skeleton — links are hardcoded for now.
// Auth-aware rendering (show username / logout button when logged in)
// will be added in PR 5 once the auth store is in place.
function Navbar() {
  return (
    <nav>
      <Link to="/">Home</Link>
      {' | '}
      <Link to="/lobby">Lobby</Link>
      {' | '}
      <Link to="/leaderboard">Leaderboard</Link>
      {' | '}
      <Link to="/login">Login</Link>
      {' | '}
      <Link to="/register">Register</Link>
    </nav>
  );
}

export default Navbar;
