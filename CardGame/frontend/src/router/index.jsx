import { Suspense, lazy, useEffect } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';

import Navbar from '../components/layout/Navbar.jsx';
import PrivateRoute from './PrivateRoute.jsx';

import useAuthStore from '../store/authStore.js';
import { audioManager } from '../utils/audioManager.js';

const HomePage = lazy(() => import('../pages/HomePage.jsx'));
const LoginPage = lazy(() => import('../pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('../pages/RegisterPage.jsx'));
const LobbyPage = lazy(() => import('../pages/LobbyPage.jsx'));
const SkillSelectPage = lazy(() => import('../pages/SkillSelectPage.jsx'));
const GamePage = lazy(() => import('../pages/GamePage.jsx'));
const ProfilePage = lazy(() => import('../pages/ProfilePage.jsx'));
const LeaderboardPage = lazy(() => import('../pages/LeaderboardPage.jsx'));
const ReplayPage = lazy(() => import('../pages/ReplayPage.jsx'));
const RogueGamePage = lazy(() => import('../pages/RogueGamePage.jsx'));
const AttackEffectPreviewPage = lazy(() => import('../pages/AttackEffectPreviewPage.jsx'));

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

function RouteFallback() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--navbar-height))] items-center justify-center bg-[#040410] px-6 text-center text-sm tracking-[0.18em] text-stone-400">
      Loading...
    </div>
  );
}

function withSuspense(element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

const router = createBrowserRouter([
  {
    // All routes share the RootLayout (Navbar + page area).
    element: <RootLayout />,
    children: [
      // --- Public routes ---
      { path: '/', element: withSuspense(<HomePage />) },
      { path: '/login', element: withSuspense(<LoginPage />) },
      { path: '/register', element: withSuspense(<RegisterPage />) },
      { path: '/profile/:userId', element: withSuspense(<ProfilePage />) },
      {
        path: '/leaderboard',
        element: withSuspense(
          <PrivateRoute>
            <LeaderboardPage />
          </PrivateRoute>
        ),
      },
      { path: '/attack-effect-preview', element: withSuspense(<AttackEffectPreviewPage />) },

      // --- Protected routes (require a valid token in localStorage) ---
      {
        path: '/lobby',
        element: withSuspense(
          <PrivateRoute>
            <LobbyPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/room/:roomId/skills',
        element: withSuspense(
          <PrivateRoute>
            <SkillSelectPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/room/:roomId/game',
        element: withSuspense(
          <PrivateRoute>
            <GamePage />
          </PrivateRoute>
        ),
      },
      {
        path: '/match/:matchId/replay',
        element: withSuspense(
          <PrivateRoute>
            <ReplayPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/rogue',
        element: (
          <PrivateRoute>
            <RogueGamePage />
          </PrivateRoute>
        ),
      },
    ],
  },
]);

export default router;
