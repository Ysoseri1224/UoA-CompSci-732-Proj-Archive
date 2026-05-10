import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getUserStats } from '../api/userApi.js';
import { useAuth } from '../hooks/useAuth.js';

// Shown when profile/stats API fails or userId is missing (local dev, offline, etc.)
const MOCK_STATS = {
  totalWins: 0,
  totalGames: 0,
  winRateDisplay: '—',
};

const MOCK_MATCH_ROWS = [
  { result: 'Victory', opp: 'vs AI', ago: '2 hours ago', tone: 'text-emerald-400/95' },
  { result: 'Defeat', opp: 'vs AI', ago: '5 hours ago', tone: 'text-rose-400/90' },
  { result: 'Victory', opp: 'vs AI', ago: 'Yesterday', tone: 'text-emerald-400/95' },
  { result: 'Defeat', opp: 'vs AI', ago: '2 days ago', tone: 'text-rose-400/90' },
];

/** Lobby card-back art (Profile card decorative background). */
const LOBBY_SOLO_CARD_BG_URL = '/lobby/cardBack.png';
/** Solo PvE CTA background clip (`public/lobby/`). */
const LOBBY_SOLO_CARD_VIDEO_URL = '/lobby/lobby-card.mp4';
/** Filenames match `public/lobby` (case-sensitive on Linux). */
const LOBBY_SEASON_ICON_URL = '/lobby/season-icon.PNG';
const LOBBY_VICTORY_ICON_URL = '/lobby/victory-icon.PNG';
const LOBBY_LOSE_ICON_URL = '/lobby/lose-icon.PNG';
/** Brand mark served from `public/logo/`. */
const LOBBY_LOGO_ICON_URL = '/logo/logo-icon-transparent.png';
/** Ambient lobby background clip (`public/lobby/`). */
const LOBBY_BACKGROUND_VIDEO_URL = '/lobby/lobbyBackground.mp4';

const navIconWrap = 'h-[1.125rem] w-[1.125rem] shrink-0';
const headerToolbarActionIconClass =
    'h-[1.35rem] w-[1.35rem] shrink-0 text-violet-50 sm:h-[1.5rem] sm:w-[1.5rem]';

function HeaderToolbarBell({ iconClass }) {
  const c = iconClass ?? headerToolbarActionIconClass;
  return (
      <svg
          className={c}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
  );
}

function HeaderToolbarSun({ iconClass }) {
  const c = iconClass ?? headerToolbarActionIconClass;
  return (
      <svg
          className={c}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
      >
        <circle cx="12" cy="12" r="4.25" />
        <path d="M12 1.75v2.85M12 19.4v2.85M4.22 4.22l2 2M17.78 17.78l2 2M1.75 12h2.85M19.4 12h2.85M4.22 19.78l2-2M17.78 6.22l2-2" />
      </svg>
  );
}

function SidebarIconLobby({ active, iconClass }) {
  const wrap = iconClass ?? navIconWrap;
  if (active) {
    return (
        <svg className={`${wrap} opacity-[0.98]`} viewBox="0 0 24 24" aria-hidden>
          <path fill="currentColor" d="M12 3.4 4 10.25V21h5.85v-6.7h4.3V21H20v-10.75L12 3.4z" />
        </svg>
    );
  }
  return (
      <svg
          className={`${wrap} opacity-[0.92]`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
      >
        <path d="M3.5 10.4 12 4.2l8.5 6.2v9.8h-5v-6.2H8.5v6.2h-5v-9.8z" />
      </svg>
  );
}

function SidebarIconTrophy({ iconClass }) {
  const wrap = iconClass ?? navIconWrap;
  return (
      <svg
          className={`${wrap} opacity-[0.92]`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
      >
        <path d="M8 9V7.5A3.5 3.5 0 0111.5 4h1A3.5 3.5 0 0116 7.5V9" />
        <path d="M6 9h12v2.5a5 5 0 01-10 0V9" />
        <path d="M17 9h1.6a1.5 1.5 0 010 3H17M7 9H5.4a1.5 1.5 0 100 3H7" />
        <path d="M11 14l-1 7h4l-1-7M9 21h6" />
      </svg>
  );
}

function SidebarIconUser({ iconClass }) {
  const wrap = iconClass ?? navIconWrap;
  return (
      <svg
          className={`${wrap} opacity-[0.92]`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
      >
        <circle cx="12" cy="8.75" r="3.25" />
        <path d="M6.25 20v-.75c0-3 2.65-5.5 5.75-5.5s5.75 2.5 5.75 5.5v.75" />
      </svg>
  );
}

function SidebarIconAchievement({ iconClass }) {
  const wrap = iconClass ?? navIconWrap;
  return (
      <svg
          className={`${wrap} opacity-[0.88]`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
      >
        <path d="M12 21s6.5-3.2 8.5-8.2V7L12 4 3.5 7v5.8C5.5 17.8 12 21 12 21z" />
        <path d="M12 9.2l.95 2.2h2.4l-1.95 1.35.75 2.35L12 14l-2.15 1.5.75-2.35L8.65 11.4h2.4L12 9.2z" />
      </svg>
  );
}

function SidebarIconSettings({ iconClass }) {
  const wrap = iconClass ?? navIconWrap;
  return (
      <svg
          className={`${wrap} opacity-[0.88]`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2.3M12 20.7V23M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M1 12h2.3M20.7 12H23M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
      </svg>
  );
}

function SidebarIconLogout({ iconClass }) {
  const wrap = iconClass ?? navIconWrap;
  return (
      <svg
          className={`${wrap} opacity-[0.9]`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
      >
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
  );
}

/**
 * Authenticated lobby dashboard — references images under /lobby/*. Match list remains mock-only.
 */
export default function LobbyPage() {
  const { user, clearAuth } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalWins: null,
    totalGames: null,
    winRateDisplay: null,
    loaded: false,
  });

  const displayName = user?.username?.trim() || 'Traveler';
  const profilePath = user?.id ? `/profile/${user.id}` : '/leaderboard';

  const initials = useMemo(() => {
    const u = user?.username?.trim();
    if (!u) return '?';
    const parts = u.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
    }
    return u.slice(0, 2).toUpperCase();
  }, [user?.username]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      if (!user?.id) {
        if (!cancelled) {
          setStats({
            totalWins: MOCK_STATS.totalWins,
            totalGames: MOCK_STATS.totalGames,
            winRateDisplay: MOCK_STATS.winRateDisplay,
            loaded: true,
          });
        }
        return;
      }

      try {
        const data = await getUserStats(user.id);
        if (cancelled) return;
        const games = data?.totalGames ?? 0;
        const wins = data?.totalWins ?? 0;
        const wr =
            games > 0 && typeof data?.winRate === 'number'
                ? `${(data.winRate * 100).toFixed(1)}%`
                : '—';
        setStats({
          totalWins: wins,
          totalGames: games,
          winRateDisplay: wr,
          loaded: true,
        });
      } catch {
        if (!cancelled) {
          setStats({
            totalWins: MOCK_STATS.totalWins,
            totalGames: MOCK_STATS.totalGames,
            winRateDisplay: MOCK_STATS.winRateDisplay,
            loaded: true,
          });
        }
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  function handleLogout() {
    clearAuth();
    navigate('/');
  }

  const winsLabel = stats.loaded ? stats.totalWins : '…';
  const gamesLabel = stats.loaded ? stats.totalGames : '…';
  const rateLabel = stats.loaded ? stats.winRateDisplay : '…';

  const displayNameCaps = displayName.toUpperCase();

  const panelSurface =
      'rounded-2xl border border-violet-400/26 bg-white/[0.055] shadow-[0_0_40px_rgba(88,28,135,0.16),0_10px_36px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl';
  const padStd = 'p-5 md:p-6';

  const navInactive =
      'flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-3 text-left text-[0.8125rem] font-medium leading-snug text-slate-200/95 transition hover:border-violet-500/35 hover:bg-white/[0.07] hover:text-white';
  const navActive =
      'flex w-full items-center gap-3 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-violet-600/26 to-cyan-600/14 px-3.5 py-3 text-left text-[0.8125rem] font-semibold leading-snug text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_28px_rgba(139,92,246,0.12)] ring-1 ring-cyan-400/15';

  const labelUi = 'font-sans text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cyan-400/95';

  const actionCardBase = `${panelSurface} ${padStd} group relative min-h-0 overflow-hidden transition hover:border-cyan-400/38 hover:shadow-[0_0_44px_rgba(139,92,246,0.2)]`;

  const soloCardGlow =
      'border-violet-400/45 shadow-[0_0_36px_rgba(139,92,246,0.32),0_10px_36px_rgba(0,0,0,0.45)] ring-1 ring-violet-400/35';

  return (
      <div
          className="lobby-dash-root relative isolate flex h-[calc(100dvh-var(--navbar-height))] min-h-[calc(100dvh-var(--navbar-height))] w-full max-w-[100vw] flex-col overflow-x-hidden bg-[#05050f] text-slate-200"
      >
        <style>{`
        @keyframes lobby-pulse {
          0%, 100% { opacity: 0.36; }
          50% { opacity: 0.68; }
        }
        .lobby-glow-orb { animation: lobby-pulse 11s ease-in-out infinite; }
        .lobby-display-serif {
          font-family: Georgia, 'Times New Roman', Times, serif;
        }
        .lobby-sidebar-label {
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .lobby-header-brand-word {
          font-family: Georgia, 'Times New Roman', Times, serif;
          font-weight: 900;
          letter-spacing: 0.09em;
          line-height: 0.92;
          text-transform: uppercase;
          font-size: clamp(1.1rem, 3.35vw, 1.92rem);
          background-image: linear-gradient(
            172deg,
            #ffffff 0%,
            #f6f4ff 8%,
            #e8e2fb 22%,
            #c9bce8 45%,
            #8f7ec2 62%,
            #5f4f8f 82%,
            #3c2f5f 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          transform: skewX(-2deg);
          filter: drop-shadow(0 3px 1px rgba(0, 0, 0, 0.95)) drop-shadow(0 1px 0 rgba(167, 139, 250, 0.5))
            drop-shadow(0 0 18px rgba(186, 170, 255, 0.55)) drop-shadow(0 0 36px rgba(88, 28, 135, 0.45));
        }

        /* ── 14″ / narrow desktop only: proportional tighten; ≥1601px unchanged ── */
        @media (max-width: 1600px) {
          .lobby-dash-root .lobby-dash-shell {
            padding-left: clamp(0.85rem, 1.9vw, 2.75rem);
            padding-right: clamp(0.85rem, 1.9vw, 2.75rem);
            padding-top: clamp(0.95rem, 2vw, 1.35rem);
            padding-bottom: clamp(0.95rem, 2vw, 1.35rem);
          }
          .lobby-dash-root .lobby-dash-header {
            margin-bottom: clamp(1.35rem, 2.65vw, 2.65rem);
          }
          .lobby-dash-root .lobby-dash-main {
            gap: clamp(1.65rem, 2.85vw, 2.85rem);
          }
          .lobby-dash-root .lobby-dash-aside {
            gap: clamp(1.65rem, 2.85vw, 2.85rem);
          }
        }

        @media (max-width: 1600px) and (min-width: 1024px) {
          .lobby-dash-root .lobby-dash-grid {
            gap: clamp(1.75rem, 3vw, 3rem);
            grid-template-columns: minmax(220px, min(272px, 17.9vw)) minmax(0, 1fr) minmax(236px, min(292px, 19.25vw));
          }
        }

        @media (max-width: 1512px) and (min-width: 1024px) {
          .lobby-dash-root .lobby-dash-grid {
            gap: clamp(1.35rem, 2.65vw, 2.65rem);
            grid-template-columns: minmax(200px, min(252px, 17vw)) minmax(0, 1fr) minmax(220px, min(276px, 18.85vw));
          }
          .lobby-dash-root .lobby-dash-hero-title {
            font-size: clamp(1.5rem, 3.95vw, 2.72rem);
            letter-spacing: 0.032em;
          }
        }

        @media (max-width: 1440px) and (min-width: 1024px) {
          .lobby-dash-root .lobby-dash-grid {
            gap: clamp(1.25rem, 2.35vw, 2.35rem);
            grid-template-columns: minmax(192px, min(238px, 16.75vw)) minmax(0, 1fr) minmax(208px, min(264px, 18.65vw));
          }
          .lobby-dash-root .lobby-dash-shell {
            padding-left: clamp(0.75rem, 1.65vw, 2.25rem);
            padding-right: clamp(0.75rem, 1.65vw, 2.25rem);
          }
        }

        @media (max-width: 1280px) and (min-width: 1024px) {
          .lobby-dash-root .lobby-dash-grid {
            gap: clamp(1.05rem, 2.05vw, 2.05rem);
            grid-template-columns: minmax(180px, min(224px, 18vw)) minmax(0, 1fr) minmax(196px, min(248px, 21vw));
          }
          .lobby-dash-root .lobby-dash-hero-title {
            font-size: clamp(1.38rem, 3.85vw, 2.48rem);
          }
        }
      `}</style>

        <video
            className="pointer-events-none absolute inset-0 z-0 h-full min-h-full w-full min-w-full object-cover"
            aria-hidden
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            src={LOBBY_BACKGROUND_VIDEO_URL}
        />
        <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#05050f]/82 via-[#070712]/88 to-[#030308]/92"
            aria-hidden
        />
        <div
            className="lobby-glow-orb pointer-events-none absolute inset-0 z-[2]"
            aria-hidden
            style={{
              background:
                  'radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.1), transparent 38%), radial-gradient(circle at 85% 55%, rgba(59, 130, 246, 0.06), transparent 42%)',
            }}
        />

        <div className="lobby-dash-shell relative z-10 flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 pb-5 pt-5 sm:px-6 md:pb-6 xl:px-12">
          {/* —— Top bar (full width) —— */}
          <header
              className={`lobby-dash-header ${panelSurface} ${padStd} mb-7 flex shrink-0 flex-wrap items-center justify-between gap-4 lg:mb-10`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 sm:gap-x-6">
                <span className="lobby-header-brand-word shrink-0">CARD</span>
                <img
                    src={LOBBY_LOGO_ICON_URL}
                    alt=""
                    className="h-[2.875rem] w-[2.875rem] shrink-0 object-contain drop-shadow-[0_0_24px_rgba(139,92,246,0.5)] sm:h-[3.35rem] sm:w-[3.35rem]"
                    aria-hidden
                />
                <span className="lobby-header-brand-word shrink-0">ROGUE</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {[
                { label: 'Notifications', Icon: HeaderToolbarBell },
                { label: 'Brightness', Icon: HeaderToolbarSun },
              ].map(({ label, Icon }) => (
                  <button
                      key={label}
                      type="button"
                      disabled
                      title={`${label} (coming soon)`}
                      className="flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-xl border border-violet-200/38 bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_24px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.12] sm:h-12 sm:w-12"
                  >
                    <span className="sr-only">{label}</span>
                    <Icon />
                  </button>
              ))}
            </div>
          </header>

          {/* —— Three columns (reference proportions) —— */}
          <div className="lobby-dash-grid grid min-h-0 min-w-0 max-w-full flex-1 grid-cols-1 gap-8 pb-3 lg:grid-cols-[minmax(248px,280px)_minmax(0,1fr)_minmax(268px,300px)] lg:items-stretch lg:gap-12 xl:gap-16">
            {/* LEFT — profile / XP / stats / nav */}
            <aside className={`${panelSurface} ${padStd} flex min-h-0 min-w-0 flex-col overflow-y-auto`}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-5 text-center lg:flex-row lg:items-start lg:gap-5 lg:text-left">
                  <div
                      className="flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center rounded-full text-[1.35rem] font-black tabular-nums tracking-tight text-white ring-2 ring-violet-400/45 ring-offset-[3px] ring-offset-[rgba(8,6,18,0.85)]"
                      style={{
                        background: 'linear-gradient(152deg, rgba(156, 117, 246, 0.58) 0%, rgba(99, 91, 246, 0.32) 45%, rgba(59, 130, 246, 0.28) 100%)',
                        boxShadow: '0 0 32px rgba(139, 92, 246, 0.42), inset 0 1px 0 rgba(255,255,255,0.22)',
                      }}
                      aria-hidden
                  >
                    {initials}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 lg:items-stretch lg:pt-0.5">
                    <div className="flex w-full items-center justify-center gap-2 lg:justify-start">
                      <h2 className="truncate font-sans text-xl font-semibold tracking-tight text-white">{displayName}</h2>
                      <span className="shrink-0 text-sm text-violet-400/50 transition hover:text-violet-300/80" aria-hidden title="Display name">
                      ✎
                    </span>
                    </div>
                    <p className="lobby-sidebar-label text-violet-400/72">Ranked adventurer</p>
                    <div className="mt-3 w-full lg:mt-4">
                      <div className="mb-1.5 flex justify-between gap-3 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <span>XP</span>
                        <span className="tabular-nums tracking-normal text-violet-100/90">3,240 / 5,000</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-black/55 shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.07]">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.45)]"
                            style={{ width: '64.8%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="grid grid-cols-3 gap-3 text-center font-sans">
                    <div className="flex flex-col gap-1">
                      <div className="text-lg font-bold tabular-nums leading-none text-white">{winsLabel}</div>
                      <div className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-slate-500">Wins</div>
                    </div>
                    <div className="flex flex-col gap-1 border-x border-white/[0.06]">
                      <div className="text-lg font-bold tabular-nums leading-none text-white">{gamesLabel}</div>
                      <div className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-slate-500">Games</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="text-lg font-bold tabular-nums leading-none text-violet-100">{rateLabel}</div>
                      <div className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-slate-500">Win %</div>
                    </div>
                  </div>
                </div>
              </div>

              <nav className="mt-7 flex flex-1 flex-col gap-1.5 border-t border-white/10 pt-6">
                <NavLink end to="/lobby" className={({ isActive }) => (isActive ? navActive : navInactive)}>
                  {({ isActive }) => (
                      <>
                        <SidebarIconLobby active={isActive} />
                        Lobby
                      </>
                  )}
                </NavLink>
                <NavLink to="/leaderboard" className={({ isActive }) => (isActive ? navActive : navInactive)}>
                  <SidebarIconTrophy />
                  Leaderboard
                </NavLink>
                <NavLink to={profilePath} className={({ isActive }) => (isActive ? navActive : navInactive)}>
                  <SidebarIconUser />
                  Profile
                </NavLink>
                <button
                    type="button"
                    disabled
                    title="Coming soon"
                    className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-left text-[0.8125rem] font-medium leading-snug text-slate-500"
                >
                <span className="text-slate-500" aria-hidden>
                  <SidebarIconAchievement />
                </span>
                  Achievements
                  <span className="ml-auto rounded-md border border-amber-500/35 bg-amber-500/[0.12] px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.12em] text-amber-200/95">
                  Soon
                </span>
                </button>
                <button
                    type="button"
                    disabled
                    title="Coming soon"
                    className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-left text-[0.8125rem] font-medium leading-snug text-slate-500"
                >
                <span className="text-slate-500" aria-hidden>
                  <SidebarIconSettings />
                </span>
                  Settings
                  <span className="ml-auto rounded-md border border-amber-500/35 bg-amber-500/[0.12] px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.12em] text-amber-200/95">
                  Soon
                </span>
                </button>
              </nav>

              <div className="mt-8 border-t border-white/10 pt-6">
                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/38 bg-gradient-to-b from-rose-950/45 to-rose-950/30 py-3 text-[0.8125rem] font-semibold text-rose-50 shadow-[0_8px_24px_rgba(190,24,93,0.08)] transition hover:border-rose-400/52 hover:from-rose-950/55 hover:to-rose-950/40 hover:text-white"
                >
                <span aria-hidden className="text-rose-200/95">
                  <SidebarIconLogout iconClass="h-[1.0625rem] w-[1.0625rem] shrink-0" />
                </span>
                  Logout
                </button>
              </div>
            </aside>

            {/* CENTER — hero + solo fills middle; leaderboard/profile at bottom */}
            <main className="lobby-dash-main flex h-full min-h-0 min-w-0 flex-col gap-8 lg:gap-10">
              <section
                  className="relative w-full shrink-0 self-start overflow-hidden rounded-2xl border border-violet-400/22 bg-black/35 shadow-[0_0_48px_rgba(88,28,135,0.18)] backdrop-blur-md min-h-[11rem] sm:min-h-[13rem] md:w-1/2 md:max-w-[50%] lg:min-h-[15rem]"
                  style={{
                    backgroundImage: [
                      'linear-gradient(105deg, rgba(8,6,20,0.94) 0%, rgba(8,6,20,0.55) 45%, rgba(25,12,40,0.35) 100%)',
                      'radial-gradient(ellipse 90% 120% at 85% 110%, rgba(88,28,135,0.35), transparent 55%)',
                      'radial-gradient(ellipse 60% 80% at 30% 0%, rgba(59,130,246,0.12), transparent 50%)',
                    ].join(', '),
                  }}
              >
                <div
                    className="pointer-events-none absolute bottom-0 right-0 h-4/5 w-3/5 opacity-40"
                    aria-hidden
                    style={{
                      background:
                          'radial-gradient(ellipse at 70% 100%, rgba(139,92,246,0.25), transparent 70%), linear-gradient(180deg, transparent 40%, rgba(4,4,16,0.85))',
                    }}
                />
                <div className="relative z-10 flex h-full flex-col justify-center p-5 md:p-7 lg:p-8">
                  <p className={`${labelUi} mb-2 text-cyan-300/90`}>WELCOME BACK,</p>
                  <h1 className="lobby-dash-hero-title lobby-display-serif text-[clamp(1.75rem,4.2vw,3rem)] font-bold uppercase leading-[1.05] tracking-[0.04em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
                    {displayNameCaps}
                  </h1>
                  <p className="mt-3 text-base font-medium italic tracking-wide text-violet-200/95 sm:text-lg">
                    ✧ Battle. Strategy. Victory. ✧
                  </p>
                  <p className="mt-3 max-w-none text-sm leading-relaxed text-slate-400/95">
                    Step into the arena — sharpen your decks in Solo PvE runs.
                  </p>
                </div>
              </section>

              <button
                  type="button"
                  onClick={() => {
                    const roomId = `solo-${Date.now()}`;
                    navigate(`/room/${roomId}/game`);
                  }}
                  className={`${actionCardBase} ${soloCardGlow} flex w-full flex-1 flex-col justify-between gap-4 self-start text-left font-sans min-h-[11.5rem] sm:min-h-[12.5rem] md:w-1/2 md:max-w-[50%]`}
              >
                <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
                  <video
                      className="absolute left-1/2 top-1/2 h-full min-h-full w-full min-w-full max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      src={LOBBY_SOLO_CARD_VIDEO_URL}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#07060f]/88 via-[#07060f]/45 to-transparent" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(7,6,15,0.82)_0%,rgba(7,6,15,0.52)_42%,rgba(7,6,15,0.15)_72%,transparent_98%)]" />
                </div>
                <div
                    className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-violet-600/14 via-transparent to-cyan-500/08"
                    aria-hidden
                />
                <div className="pointer-events-none absolute -right-6 top-4 z-[1] h-24 w-24 rounded-full bg-violet-500/15 blur-2xl" aria-hidden />
                <div className="relative z-[2] min-w-0 sm:max-w-[58%]">
                  <p className={labelUi}>SOLO</p>
                  <h3 className="mt-2 text-lg font-black uppercase tracking-wide text-white md:text-xl">START SOLO PVE</h3>
                  <p className="mt-2 text-sm text-slate-400">Challenge the AI and test your skills.</p>
                </div>
                <span className="relative z-[2] grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-3 rounded-full bg-gradient-to-b from-violet-500 via-violet-600 to-violet-800 py-[0.95rem] pl-10 pr-5 text-[0.95rem] font-semibold tracking-[0.02em] text-white shadow-[0_10px_32px_rgba(76,29,149,0.5),0_2px_0_rgba(255,255,255,0.08)_inset] ring-1 ring-white/12 transition group-hover:brightness-[1.06] sm:py-4 sm:pl-12 sm:pr-6 sm:text-base">
                <span className="pointer-events-none select-none" aria-hidden />
                <span className="text-center">Start Solo PvE</span>
                <span className="justify-self-end pr-0.5 text-[1.35rem] font-medium leading-none text-white/95" aria-hidden>
                  ›
                </span>
              </span>
              </button>

              <div className="w-full shrink-0">
                <div className="grid min-h-0 shrink-0 grid-cols-1 items-start gap-6 sm:grid-cols-2 sm:gap-7 xl:gap-8">
                  <button
                      type="button"
                      onClick={() => navigate('/leaderboard')}
                      className={`${actionCardBase} flex min-h-[7rem] flex-col justify-between text-left font-sans sm:min-h-[7.75rem]`}
                  >
                    <div className="pointer-events-none absolute inset-0" aria-hidden>
                      <div
                          className="absolute inset-0 bg-no-repeat"
                          style={{
                            backgroundImage: "url('/lobby/goldCup.png')",
                            backgroundPosition: '64% 52%',
                            backgroundSize: 'cover',
                            opacity: 0.46,
                            filter: 'brightness(1.08) contrast(1.06) saturate(1.04)',
                          }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/25 via-transparent to-amber-950/15" />
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(7,6,13,0.94)_0%,rgba(7,6,13,0.82)_18%,rgba(7,6,13,0.55)_38%,rgba(7,6,13,0.28)_56%,rgba(7,6,13,0.1)_74%,transparent_96%)]" />
                      <div className="absolute -right-[10%] top-1/2 h-[95%] w-[70%] -translate-y-1/2 rounded-full bg-amber-400/8 blur-[3.75rem]" />
                    </div>
                    <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-between gap-2 pt-px sm:gap-2.5 pr-3">
                      <div className="min-w-0 max-w-[13rem] pr-2">
                        <p className={`${labelUi} !tracking-[0.27em]`}>BOARD</p>
                        <h3 className="lobby-display-serif mt-1.5 text-base font-bold uppercase leading-tight tracking-[0.12em] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)] md:text-lg">
                          LEADERBOARD
                        </h3>
                        <p className="mt-2 text-[0.85rem] font-medium leading-snug text-slate-400/95">
                          See how you rank
                          <br />
                          against players
                        </p>
                      </div>
                      <span className="self-start text-[0.8rem] font-bold uppercase tracking-[0.22em] text-cyan-300/95 drop-shadow-[0_0_12px_rgba(34,211,238,0.22)] group-hover:text-cyan-200 sm:text-sm">
                    VIEW RANKINGS →
                  </span>
                    </div>
                  </button>

                  <button
                      type="button"
                      onClick={() => navigate(profilePath)}
                      className={`${actionCardBase} flex min-h-[7rem] flex-col justify-between text-left font-sans sm:min-h-[7.75rem]`}
                  >
                    <div className="pointer-events-none absolute inset-0" aria-hidden>
                      <div
                          className="absolute inset-0 bg-no-repeat"
                          style={{
                            backgroundImage: `url(${LOBBY_SOLO_CARD_BG_URL})`,
                            backgroundPosition: '72% 48%',
                            backgroundSize: 'cover',
                            opacity: 0.42,
                            filter: 'brightness(1.06) contrast(1.05) saturate(1.06)',
                          }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/35 via-transparent to-violet-800/18" />
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(7,6,13,0.93)_0%,rgba(7,6,13,0.8)_17%,rgba(7,6,13,0.52)_37%,rgba(7,6,13,0.24)_54%,rgba(7,6,13,0.08)_71%,transparent_95%)]" />
                      <div className="absolute -right-[8%] top-1/2 h-[98%] w-[65%] -translate-y-1/2 rounded-full bg-violet-500/16 blur-[3.75rem]" />
                    </div>
                    <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-between gap-2 pt-px sm:gap-2.5 pr-3">
                      <div className="min-w-0 max-w-[12.5rem] pr-2">
                        <p className={`${labelUi} !tracking-[0.27em]`}>YOU</p>
                        <h3 className="lobby-display-serif mt-1.5 text-base font-bold uppercase leading-tight tracking-[0.11em] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)] md:text-lg">
                          PROFILE
                        </h3>
                        <p className="mt-2 text-[0.85rem] font-medium leading-snug text-slate-400/95">
                          View your stats
                          <br />
                          and progress
                        </p>
                      </div>
                      <span className="self-start text-[0.8rem] font-bold uppercase tracking-[0.18em] text-violet-50/95 drop-shadow-[0_0_14px_rgba(196,181,253,0.28)] group-hover:text-white sm:text-sm">
                    OPEN PROFILE →
                  </span>
                    </div>
                  </button>
                </div>
              </div>
            </main>

            {/* RIGHT — season + recent matches (mock) */}
            <aside className="lobby-dash-aside flex min-h-0 min-w-0 flex-col gap-8 lg:gap-10">
              <div className={`${panelSurface} flex flex-col items-center px-5 pb-6 pt-6 text-center md:px-6 md:pb-7 md:pt-7`}>
                <header className="flex w-full flex-col items-center gap-2">
                  <p className="font-sans text-[0.625rem] font-semibold uppercase tracking-[0.32em] text-white/90">
                    SEASON 1
                  </p>
                  <p className="lobby-display-serif bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-400 bg-clip-text text-[clamp(1.5rem,4.8vw,1.875rem)] font-bold leading-tight tracking-[0.02em] text-transparent drop-shadow-[0_0_24px_rgba(167,139,250,0.35)]">
                    Shadow Awakening
                  </p>
                </header>

                <div className="relative mx-auto mt-10 flex min-h-[11.5rem] w-full items-center justify-center sm:mt-11 sm:min-h-[13rem]" aria-hidden>
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(100%,16rem)] w-[min(100%,16rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(167,139,250,0.42)_0%,rgba(88,28,135,0.18)_42%,transparent_72%)]" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/30 blur-[44px]" />
                  <img
                      src={LOBBY_SEASON_ICON_URL}
                      alt=""
                      className="relative z-[1] h-auto w-[min(100%,15.5rem)] max-w-[15.5rem] object-contain mix-blend-screen brightness-[1.08] contrast-105 drop-shadow-[0_0_40px_rgba(167,139,250,0.65)] sm:w-[min(100%,17rem)] sm:max-w-[17rem]"
                  />
                </div>

                <footer className="mt-12 flex w-full flex-col items-center gap-3 sm:mt-14">
                  <p className="font-sans text-[0.7rem] font-medium tracking-wide text-slate-500">Season ends in:</p>
                  <p className="font-sans text-xl font-black tracking-[0.08em] text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.12)] sm:text-2xl">
                    24d 18h 32m
                  </p>
                </footer>
              </div>

              <div className={`${panelSurface} ${padStd} flex min-h-0 flex-1 flex-col`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-violet-50 sm:text-[0.74rem]">RECENT MATCHES</h3>
                  <button
                      type="button"
                      disabled
                      title="Match API not ready"
                      className="cursor-not-allowed text-[0.75rem] font-semibold uppercase tracking-wide text-cyan-200/95 underline-offset-2 sm:text-[0.8125rem]"
                  >
                    View All
                  </button>
                </div>
                <p className="mt-2 text-[0.75rem] leading-relaxed text-violet-200/95 sm:text-sm">
                  Mock-only — no match API.
                </p>
                <ul className="mt-4 flex flex-col gap-3 overflow-y-auto text-[0.9rem] sm:text-[0.95rem]">
                  {MOCK_MATCH_ROWS.map((row, i) => (
                      <li
                          key={`${row.result}-${i}`}
                          className="flex items-center gap-3 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0"
                      >
                        <img
                            src={row.result === 'Victory' ? LOBBY_VICTORY_ICON_URL : LOBBY_LOSE_ICON_URL}
                            alt=""
                            className="h-10 w-10 shrink-0 object-contain mix-blend-screen brightness-105 contrast-105 drop-shadow-[0_0_12px_rgba(139,92,246,0.35)] sm:h-11 sm:w-11"
                        />
                        <div className="min-w-0 flex-1 leading-snug">
                          <div>
                            <span className={`font-semibold ${row.tone}`}>{row.result}</span>
                            <span className="text-violet-100/92"> · {row.opp}</span>
                          </div>
                          <div className="mt-1 text-[0.8rem] font-medium tracking-wide text-violet-50/92 sm:text-[0.875rem]">
                            {row.ago}
                          </div>
                        </div>
                      </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>

          {/* Footer */}
          <footer className="mt-auto flex shrink-0 flex-wrap items-center justify-center gap-8 border-t border-white/8 px-4 py-5 font-sans text-[0.7rem] text-slate-500 sm:gap-10">
            <div className="flex gap-6">
            <span className="cursor-not-allowed opacity-50" title="Coming soon">
              Discord
            </span>
              <span className="cursor-not-allowed opacity-50" title="Coming soon">
              Twitter
            </span>
              <span className="cursor-not-allowed opacity-50" title="Coming soon">
              Web
            </span>
            </div>
            <p>Card Rogue © {new Date().getFullYear()} All rights reserved.</p>
          </footer>
        </div>
      </div>
  );
}
