import { createBrowserRouter, Outlet } from 'react-router-dom';

import Navbar from '../components/layout/Navbar.jsx';
import PrivateRoute from './PrivateRoute.jsx';

import HomePage from '../pages/HomePage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import LobbyPage from '../pages/LobbyPage.jsx';
import SkillSelectPage from '../pages/SkillSelectPage.jsx';
import GamePage from '../pages/GamePage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import LeaderboardPage from '../pages/LeaderboardPage.jsx';
import ReplayPage from '../pages/ReplayPage.jsx';

// Root layout wraps every page with the Navbar.
// <Outlet /> renders the matched child route's component below the Navbar.
function RootLayout() {
  return (
    <>
      <Navbar />
      {/* Offset matches Navbar via --navbar-height; dark paint so ancestors never flash white */}
      <main className="min-h-[100dvh] bg-[#040410] pt-[var(--navbar-height)]">
        <Outlet />
      </main>
    </>
  );
}

const router = createBrowserRouter([
  {
    // All routes share the RootLayout (Navbar + page area).
    element: <RootLayout />,
    children: [
      // --- Public routes ---
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/profile/:userId', element: <ProfilePage /> },
      { path: '/leaderboard', element: <LeaderboardPage /> },

      // --- Protected routes (require a valid token in localStorage) ---
      {
        path: '/lobby',
        element: (
          <PrivateRoute>
            <LobbyPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/room/:roomId/skills',
        element: (
          <PrivateRoute>
            <SkillSelectPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/room/:roomId/game',
        element: <GamePage />,
      },
      {
        path: '/match/:matchId/replay',
        element: (
          <PrivateRoute>
            <ReplayPage />
          </PrivateRoute>
        ),
      },
    ],
  },
]);

export default router;
