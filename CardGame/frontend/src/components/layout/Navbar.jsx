import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../../api/authApi.js';
import { useAuth } from '../../hooks/useAuth.js';

function Navbar() {
  const { isAuthenticated, clearAuth } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const dashboardShell = pathname === '/lobby' || pathname === '/leaderboard';
  /** Lobby / leaderboard dashboards use inline sidebar; hide duplicate centre links when logged in. */
  const hideCenterNav = isAuthenticated && dashboardShell;
  /** Hide Home in dashboard shell routes when authenticated. */
  const showHomeLink = !isAuthenticated || !dashboardShell;

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

  const linkBase =
    'text-slate-300 hover:text-white text-base min-[1512px]:text-lg font-medium transition-colors duration-200';

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
        <Link to="/" className="flex shrink-0 items-center gap-2 md:gap-3">
          <img
            src="/logo/logo-icon-transparent.png"
            alt=""
            className="h-8 w-8 shrink-0 object-contain min-[1512px]:h-9 min-[1512px]:w-9"
            draggable={false}
          />
          <span className="text-base font-bold tracking-wide text-white md:text-lg min-[1512px]:text-xl">
            Card Rogue
          </span>
        </Link>

        {/* Centre links — omitted on Lobby when logged in (sidebar handles nav). */}
        {!hideCenterNav && (
          <div className="hidden items-center gap-8 min-[1512px]:gap-12 md:flex">
            {showHomeLink && (
              <Link to="/" className={linkBase}>
                Home
              </Link>
            )}
            <Link to="/lobby" className={linkBase}>
              Lobby
            </Link>
            <Link to="/leaderboard" className={linkBase}>
              Leaderboard
            </Link>
          </div>
        )}

        {/* Right — guest auth vs dashboard profile */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 min-[1512px]:gap-4">
          {!isAuthenticated && (
            <>
              {/* Login — outlined pill */}
              <Link
                to="/login"
                className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-white/45 hover:bg-violet-500/[0.08] hover:text-white min-[1512px]:px-7 min-[1512px]:py-3 min-[1512px]:text-lg"
              >
                Login
              </Link>
              {/* Register — filled gradient pill */}
              <Link
                to="/register"
                className="rounded-full px-4 py-2 text-sm font-bold text-white transition-all duration-200 hover:brightness-110 min-[1512px]:px-7 min-[1512px]:py-3 min-[1512px]:text-lg"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #dc2626)',
                  boxShadow: '0 0 16px rgba(249,115,22,0.28)',
                }}
              >
                Register
              </Link>
            </>
          )}

          {isAuthenticated && (
            <>
              {/* {user && (
                <Link
                  to={`/profile/${user.id}`}
                  className="flex max-w-[14rem] items-center gap-2 rounded-full border border-transparent px-3 py-1 pl-1 pr-2 transition-colors duration-200 hover:border-white/[0.14] hover:bg-white/[0.05] sm:gap-3 sm:pr-3 min-[1512px]:gap-3"
                >
                  <span className="hidden max-w-[9rem] truncate text-right text-sm font-medium text-slate-100 sm:inline min-[1512px]:max-w-[12rem] min-[1512px]:text-base">
                    {user.username}
                  </span>
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-violet-400/50 bg-violet-600/25 text-[0.7rem] font-bold leading-none text-violet-50 shadow-[0_0_14px_rgba(139,92,246,0.35)] min-[1512px]:h-10 min-[1512px]:w-10 min-[1512px]:text-[0.8rem]"
                    aria-hidden
                  >
                    {getInitials(user.username)}
                  </div>
                  <span className="sr-only">Open profile</span>
                </Link>
              )} */}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-white/25 px-3 py-3 text-xs font-semibold text-slate-200 transition-all duration-200 hover:border-white/45 hover:bg-violet-500/[0.08] hover:text-white sm:px-4 sm:text-sm min-[1512px]:px-6 min-[1512px]:py-2 min-[1512px]:text-lg"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </nav>
    </>
  );
}

export default Navbar;
