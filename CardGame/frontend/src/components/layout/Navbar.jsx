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
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 h-20 text-slate-200"
      style={{
        background:
          'linear-gradient(180deg, #0c071c 0%, #06051a 42%, #040410 100%)',
      }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 shrink-0">
        <img
          src="/logo/logo-icon-transparent.png"
          alt=""
          className="h-9 w-9 shrink-0 object-contain"
          draggable={false}
          width={36}
          height={36}
        />
        <span className="text-white font-bold text-xl tracking-wide">Card Rogue</span>
      </Link>

      {/* Centre links */}
      <div className="hidden md:flex items-center gap-12">
        <Link
          to="/"
          className="text-slate-300 hover:text-white text-lg font-medium transition-colors duration-200"
        >
          Home
        </Link>
        <Link
          to="/lobby"
          className="text-slate-300 hover:text-white text-lg font-medium transition-colors duration-200"
        >
          Lobby
        </Link>
        <Link
          to="/leaderboard"
          className="text-slate-300 hover:text-white text-lg font-medium transition-colors duration-200"
        >
          Leaderboard
        </Link>
      </div>

      {/* Right — auth actions */}
      <div className="flex items-center gap-4">
        {/* Login — outlined pill */}
        <Link
          to="/login"
          className="text-slate-200 hover:text-white text-lg font-semibold px-7 py-3
                     rounded-full border border-white/25 hover:border-white/45
                     hover:bg-violet-500/[0.08] transition-all duration-200"
        >
          Login
        </Link>
        {/* Register — filled gradient pill */}
        <Link
          to="/register"
          className="px-7 py-3 rounded-full text-lg font-bold text-white
                     transition-all duration-200 hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, #f97316, #dc2626)',
            boxShadow: '0 0 16px rgba(249,115,22,0.28)',
          }}
        >
          Register
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
