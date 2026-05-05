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
    <>
      {/* Matches nav height classes below — HomePage uses var(--navbar-height) for slide geometry */}
      <style>{`
        :root {
          --navbar-height: 3.5rem;
        }
        @media (min-width: 768px) {
          :root {
            --navbar-height: 4rem;
          }
        }
        @media (min-width: 1512px) {
          :root {
            --navbar-height: 5rem;
          }
        }
      `}</style>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between
                   px-4 sm:px-6 md:px-8 min-[1512px]:px-16
                   h-14 md:h-16 min-[1512px]:h-20 text-slate-200"
        style={{
          background:
            'linear-gradient(180deg, #0c071c 0%, #06051a 42%, #040410 100%)',
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 md:gap-3 shrink-0">
          <div
            className="w-8 h-8 min-[1512px]:w-9 min-[1512px]:h-9 rounded-lg flex items-center justify-center select-none"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            <span className="text-white font-black text-sm min-[1512px]:text-base">♠</span>
          </div>
          <span className="text-white font-bold text-base md:text-lg min-[1512px]:text-xl tracking-wide">
            Card Rogue
          </span>
        </Link>

        {/* Centre links */}
        <div className="hidden md:flex items-center gap-8 min-[1512px]:gap-12">
          <Link
            to="/"
            className="text-slate-300 hover:text-white text-base min-[1512px]:text-lg font-medium transition-colors duration-200"
          >
            Home
          </Link>
          <Link
            to="/lobby"
            className="text-slate-300 hover:text-white text-base min-[1512px]:text-lg font-medium transition-colors duration-200"
          >
            Lobby
          </Link>
          <Link
            to="/leaderboard"
            className="text-slate-300 hover:text-white text-base min-[1512px]:text-lg font-medium transition-colors duration-200"
          >
            Leaderboard
          </Link>
        </div>

        {/* Right — auth actions */}
        <div className="flex items-center gap-2 sm:gap-3 min-[1512px]:gap-4">
          {/* Login — outlined pill */}
          <Link
            to="/login"
            className="text-slate-200 hover:text-white text-sm min-[1512px]:text-lg font-semibold px-4 py-2 min-[1512px]:px-7 min-[1512px]:py-3
                       rounded-full border border-white/25 hover:border-white/45
                       hover:bg-violet-500/[0.08] transition-all duration-200"
          >
            Login
          </Link>
          {/* Register — filled gradient pill */}
          <Link
            to="/register"
            className="px-4 py-2 min-[1512px]:px-7 min-[1512px]:py-3 rounded-full text-sm min-[1512px]:text-lg font-bold text-white
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
    </>
  );
}

export default Navbar;
