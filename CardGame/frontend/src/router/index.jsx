import { createBrowserRouter, Outlet } from 'react-router-dom';
import { useEffect } from 'react';

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
import AttackEffectPreviewPage from '../pages/AttackEffectPreviewPage.jsx';

import useAuthStore from '../store/authStore.js';
import { audioManager } from '../utils/audioManager.js';

// Root layout wraps every page with the Navbar.
// <Outlet /> renders the matched child route's component below the Navbar.
function RootLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useEffect(() => {
    if (isAuthenticated) {
      const tryPlayBGM = () => {
        audioManager.playBGM();
        document.removeEventListener('click', tryPlayBGM);
        document.removeEventListener('keydown', tryPlayBGM);
      };
      audioManager.playBGM();
      document.addEventListener('click', tryPlayBGM);
      document.addEventListener('keydown', tryPlayBGM);
      return () => {
        document.removeEventListener('click', tryPlayBGM);
        document.removeEventListener('keydown', tryPlayBGM);
      };
    } else {
      audioManager.stopBGM();
    }
  }, [isAuthenticated]);

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
      {
        path: '/leaderboard',
        element: (
          <PrivateRoute>
            <LeaderboardPage />
          </PrivateRoute>
        ),
      },
      { path: '/attack-effect-preview', element: <AttackEffectPreviewPage /> },

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
        element: (
          <PrivateRoute>
            <GamePage />
          </PrivateRoute>
        ),
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
