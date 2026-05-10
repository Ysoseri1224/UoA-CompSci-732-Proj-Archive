
import { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getLeaderboard } from '../api/leaderboardApi.js';
import { getUserStats } from '../api/userApi.js';
import { useAuth } from '../hooks/useAuth.js';

const navIconWrap = 'h-[1.125rem] w-[1.125rem] shrink-0';

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

function SidebarIconTrophy({ active, iconClass }) {
  const wrap = iconClass ?? navIconWrap;
  const strokeCls = active ? `${wrap} opacity-[0.98]` : `${wrap} opacity-[0.92]`;
  return (
    <svg
      className={strokeCls}
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {active ? (
        <path d="M8 7V6a3 3 0 013-3h2a3 3 0 013 3v1M6 7h12v3a6 6 0 01-12 0V7zm3 11h6l1 7H8l1-7z" />
      ) : (
        <>
          <path d="M8 9V7.5A3.5 3.5 0 0111.5 4h1A3.5 3.5 0 0116 7.5V9" />
          <path d="M6 9h12v2.5a5 5 0 01-10 0V9" />
          <path d="M17 9h1.6a1.5 1.5 0 010 3H17M7 9H5.4a1.5 1.5 0 100 3H7" />
          <path d="M11 14l-1 7h4l-1-7M9 21h6" />
        </>
      )}
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

function SidebarIconBack({ iconClass }) {
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
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function LeaderboardClockGlyph({ className, style }) {
  const c = className ?? 'h-6 w-6';
  return (
    <svg
      className={`${c} text-[#c89b3c]`}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.85" strokeOpacity={0.95} />
      <path d="M12 11.15V12.8l3.85 2.05" opacity={0.95} />
    </svg>
  );
}

/** Brand + assets — match LobbyPage */
const LOBBY_LOGO_ICON_URL = '/logo/logo-icon-transparent.png';
/** Filename contains a space (`leaderboard- animation.mp4`). */
const LEADERBOARD_ANIM_URL = '/leaderboard/leaderboard-%20animation.mp4';
/** Full-screen intro clip on Leaderboard mount — plays once (no loop). File: `public/leaderboard/leaderboardBackground.mp4`. */
const LEADERBOARD_BACKGROUND_VIDEO_URL = '/leaderboard/leaderboardBackground.mp4';

const LEADERBOARD_RANK_IMG = {
  1: '/leaderboard/first.PNG',
  2: '/leaderboard/second.PNG',
  3: '/leaderboard/third.PNG',
};

/** Title-column artwork — `public/leaderboard/leaderboard-icon.PNG`. */
const LEADERBOARD_HEADER_ICON_URL = '/leaderboard/leaderboard-icon.PNG';

/** Eligibility trophy — `public/leaderboard/leaderboard-cup.PNG`. */
const LEADERBOARD_CUP_URL = '/leaderboard/leaderboard-cup.PNG';

const RANK_ROW_STYLES = {
  1: {
    border: '1px solid rgba(212, 175, 55, 0.55)',
    boxShadow:
      '0 0 0 1px rgba(212, 175, 55, 0.12), 0 0 24px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
    bg: 'linear-gradient(90deg, rgba(212, 175, 55, 0.12) 0%, rgba(26,16,42,0.45) 50%, transparent 100%)',
  },
  2: {
    border: '1px solid rgba(192, 192, 192, 0.42)',
    boxShadow:
      '0 0 0 1px rgba(192, 192, 192, 0.1), 0 0 20px rgba(147, 197, 255, 0.18), inset 0 1px 0 rgba(255,255,255,0.05)',
    bg: 'linear-gradient(90deg, rgba(180, 200, 220, 0.1) 0%, rgba(20,14,38,0.5) 55%, transparent 100%)',
  },
  3: {
    border: '1px solid rgba(205, 127, 50, 0.5)',
    boxShadow:
      '0 0 0 1px rgba(205, 127, 50, 0.08), 0 0 18px rgba(205, 127, 50, 0.22), inset 0 1px 0 rgba(255,255,255,0.04)',
    bg: 'linear-gradient(90deg, rgba(205, 127, 50, 0.1) 0%, rgba(24,14,28,0.55) 55%, transparent 100%)',
  },
};

const LEADERBOARD_PAGE_LIMIT = 100;

function formatWinRate(winRate) {
  if (typeof winRate !== 'number' || Number.isNaN(winRate)) return '—';
  return `${(winRate * 100).toFixed(1)}%`;
}

/**
 * PvE Leaderboard — live rankings from GET /api/leaderboard.
 */
export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rankings, setRankings] = useState([]);
  const [rankedTotal, setRankedTotal] = useState(0);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [myRank, setMyRank] = useState({ kind: 'loading' });

  const profilePath = user?.id ? `/profile/${user.id}` : '/leaderboard';

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    setMyRank({ kind: 'loading' });

    try {
      const statsPromise =
        user?.id != null ? getUserStats(user.id).catch(() => null) : Promise.resolve(null);

      const [data, statsPayload] = await Promise.all([
        getLeaderboard('winRate', 1, LEADERBOARD_PAGE_LIMIT),
        statsPromise,
      ]);

      setRankings(data.rankings ?? []);
      setRankedTotal(typeof data.total === 'number' ? data.total : 0);

      if (!user?.id) {
        setMyRank({ kind: 'guest' });
      } else {
        const listed = (data.rankings ?? []).find((r) => String(r.userId) === String(user.id));
        if (listed) {
          setMyRank({
            kind: 'listed',
            rank: listed.rank,
            winRate: listed.winRate,
            totalGames: listed.totalGames,
          });
        } else if (!statsPayload) {
          setMyRank({ kind: 'stats_error' });
        } else if (statsPayload.totalGames < 10) {
          const need = 10 - statsPayload.totalGames;
          setMyRank({
            kind: 'ineligible',
            totalGames: statsPayload.totalGames,
            needGames: need,
          });
        } else {
          setMyRank({
            kind: 'outside_top',
            winRate: statsPayload.winRate,
            totalGames: statsPayload.totalGames,
          });
        }
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to load leaderboard. Please try again.';
      setLeaderboardError(msg);
      setRankings([]);
      setRankedTotal(0);
      setMyRank({ kind: 'leaderboard_failed', message: msg });
    } finally {
      setLeaderboardLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  /** Rankings table block — same gold matte language as hero + eligibility strip */
  const leaderboardRankingsFrame =
    'rounded-xl border border-[#c89b3c]/70 bg-black/[0.52] shadow-[0_28px_64px_-20px_rgba(0,0,0,0.82),inset_0_1px_0_rgba(200,155,60,0.15)]';
  const leaderboardRankingsMat =
    'rounded-lg border border-[#c89b3c]/60 bg-[linear-gradient(152deg,#0c0c10_0%,#0a0a0c_50%,#08080b_100%)] shadow-[inset_0_0_0_1px_rgba(200,155,60,0.09),inset_0_1px_0_rgba(255,255,255,0.035)]';
  /** Matches leaderboard clip matte (#000) so the video does not sit on a lighter glass tint. */
  const leaderboardAsideSurface =
    'rounded-2xl border border-violet-400/26 bg-black shadow-[0_0_40px_rgba(88,28,135,0.16),0_10px_36px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)]';
  const padStd = 'p-[clamp(0.65rem,1.8vw,1.35rem)]';

  const lbGoldCaps = 'lb-ft-gold-caps';

  const navInactive =
    'flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-3 text-left text-[0.8125rem] font-medium leading-snug text-slate-200/95 transition hover:border-violet-500/35 hover:bg-white/[0.07] hover:text-white';
  const navActive =
    'flex w-full items-center gap-3 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-violet-600/26 to-cyan-600/14 px-3.5 py-3 text-left text-[0.8125rem] font-semibold leading-snug text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_28px_rgba(139,92,246,0.12)] ring-1 ring-cyan-400/15';

  return (
    <div className="lb-dash-root relative isolate flex h-[calc(100dvh-var(--navbar-height))] min-h-[calc(100dvh-var(--navbar-height))] w-full max-w-[100vw] flex-col overflow-x-hidden bg-[#05050f] text-slate-200">
      <style>{`
        @keyframes lb-orbs {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.72; }
        }
        .lb-glow-orbs { animation: lb-orbs 12s ease-in-out infinite; }
        .lobby-display-serif {
          font-family: Georgia, 'Times New Roman', Times, serif;
        }
        .lobby-header-brand-word {
          font-family: Georgia, 'Times New Roman', Times, serif;
          font-weight: 900;
          letter-spacing: 0.09em;
          line-height: 0.92;
          text-transform: uppercase;
          /* Same scale curve on all viewports (desktop layout at every width) */
          font-size: clamp(0.95rem, 2.85vw, 1.92rem);
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
        .lb-row-base {
          transition:
            box-shadow 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease,
            filter 0.25s ease;
        }
        .lb-row-base:hover {
          box-shadow:
            0 0 0 1px rgba(200, 155, 90, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .lb-row-base:hover:not(.lb-row-podium) {
          background-color: rgba(18, 16, 14, 0.55) !important;
        }

        .lb-row-podium:hover {
          filter: drop-shadow(0 0 18px rgba(212, 175, 55, 0.35));
        }

        .lb-row-base:hover .lb-winrate-cell {
          color: #f5ecd8;
          text-shadow:
            0 0 12px rgba(200, 155, 80, 0.35),
            0 1px 2px rgba(0, 0, 0, 0.8);
        }

        .lb-winrate-cell {
          transition:
            color 0.22s ease,
            text-shadow 0.22s ease;
        }

        .lb-ft-display {
          font-family: "Cinzel", "Palatino Linotype", "Book Antiqua", Georgia, serif;
          font-weight: 800;
          letter-spacing: clamp(0.12em, 0.18em, 0.22em);
          text-transform: uppercase;
          line-height: 1.05;
          font-size: clamp(1.65rem, 4vw, 2.85rem);
          background-image: linear-gradient(
            185deg,
            #ffffff 0%,
            #f8f0e4 18%,
            #d8c8ac 52%,
            #8f7e65 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 3px 2px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 28px rgba(200, 155, 60, 0.38))
            drop-shadow(0 0 42px rgba(88, 28, 135, 0.12));
        }

        .lb-ft-epic-line {
          font-family: "Cormorant Garamond", "Palatino Linotype", Georgia, serif;
          font-weight: 700;
          letter-spacing: 0.06em;
          line-height: 1.22;
          font-size: clamp(1.38rem, 2.85vw, 1.72rem);
          color: #f3ece1;
          text-shadow:
            0 2px 14px rgba(0, 0, 0, 0.88),
            0 0 22px rgba(200, 155, 60, 0.2),
            0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .lb-ft-gold-caps {
          font-family: "Cinzel", "Palatino Linotype", Georgia, serif;
          font-weight: 700;
          font-size: 0.625rem;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          line-height: 1.35;
          background-image: linear-gradient(180deg, #faecc4 0%, #d4aa4a 52%, #8e6f30 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }

        .lb-ft-gold-caps--compact {
          font-size: 0.6rem;
          letter-spacing: 0.26em;
        }
        @media (min-width: 768px) {
          .lb-ft-gold-caps--compact {
            font-size: 0.65rem;
            letter-spacing: 0.29em;
          }
        }

        .lb-ft-table-th {
          font-family: "Cinzel", "Palatino Linotype", Georgia, serif;
          font-weight: 700;
          font-size: clamp(0.58rem, 1.45vw, 0.72rem);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(240, 224, 190, 0.94);
          text-shadow:
            0 1px 3px rgba(0, 0, 0, 0.92),
            0 0 18px rgba(200, 155, 70, 0.12);
        }

        .lb-rankings-table {
          font-size: clamp(0.74rem, 1.6vw, 0.9rem);
        }

        .lb-table-cell {
          padding: clamp(0.55rem, 1.1vw, 0.8rem) clamp(0.55rem, 1.5vw, 0.95rem);
        }

        .lb-rankings-table thead .lb-table-cell {
          padding-top: clamp(0.7rem, 1.3vw, 0.95rem);
          padding-bottom: clamp(0.58rem, 1.1vw, 0.75rem);
        }

        .lb-rankings-table tbody .lb-table-cell.lb-rankings-message {
          padding: clamp(1.75rem, 3.5vw, 2.5rem) clamp(1rem, 2vw, 1.5rem);
        }

        .lb-ft-footnote {
          font-family: "Cinzel", "Palatino Linotype", Georgia, serif;
          font-weight: 600;
          font-size: clamp(0.58rem, 1.2vw, 0.65rem);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          line-height: 1.5;
          color: rgba(148, 138, 168, 0.58);
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.55);
        }

        .lb-ft-motto {
          font-family: "Marcellus", "Palatino Linotype", Georgia, serif;
          font-weight: 400;
          letter-spacing: 0.32em;
          text-transform: uppercase;
        }

        .lb-ft-rank-num {
          font-family: "Cinzel", Georgia, serif;
          font-weight: 700;
        }

        /* Sidebar: arcane menu (dark fantasy, purple / black / gold) */
        @keyframes lb-sidebar-active-breathe {
          0%,
          100% {
            box-shadow:
              inset 0 0 12px rgba(120, 70, 180, 0.18),
              inset 0 1px 0 rgba(235, 200, 150, 0.22),
              0 0 0 1px rgba(200, 160, 100, 0.48),
              0 0 18px rgba(110, 70, 160, 0.28),
              0 3px 10px rgba(0, 0, 0, 0.45);
          }
          50% {
            box-shadow:
              inset 0 0 16px rgba(130, 80, 195, 0.24),
              inset 0 1px 0 rgba(248, 215, 170, 0.28),
              0 0 0 1px rgba(220, 175, 110, 0.58),
              0 0 24px rgba(125, 85, 185, 0.34),
              0 3px 12px rgba(0, 0, 0, 0.48);
          }
        }

        @keyframes lb-pedestal-drift {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.38;
          }
          50% {
            transform: translateY(-5px);
            opacity: 0.5;
          }
        }

        .lb-sidebar-nav {
          position: relative;
          display: flex;
          width: 100%;
          min-height: clamp(2.875rem, 6vh, 3.25rem);
          align-items: center;
          gap: clamp(0.4rem, 1.2vw, 0.65rem);
          padding: 0.5rem clamp(0.75rem, 2vw, 0.95rem);
          border-radius: 0.5rem;
          text-align: left;
          font-size: clamp(0.625rem, 1.65vw, 0.78rem);
          font-weight: 600;
          line-height: 1.25;
          letter-spacing: 0.025em;
          color: rgba(218, 208, 236, 0.9);
          text-decoration: none;
          border: 1px solid rgba(58, 48, 88, 0.55);
          background: linear-gradient(
            165deg,
            rgba(28, 18, 44, 0.72) 0%,
            rgba(12, 8, 22, 0.78) 100%
          );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 1px 0 rgba(0, 0, 0, 0.35);
          transition:
            border-color 0.22s ease,
            background 0.22s ease,
            color 0.2s ease,
            box-shadow 0.22s ease;
        }

        .lb-sidebar-nav svg {
          flex-shrink: 0;
          width: clamp(0.78rem, 2.4vw, 1.02rem);
          height: clamp(0.78rem, 2.4vw, 1.02rem);
          opacity: 0.88;
          transition:
            opacity 0.2s ease,
            filter 0.2s ease;
        }

        .lb-sidebar-nav:hover:not(.lb-sidebar-nav--disabled):not(.lb-sidebar-nav--active) {
          color: rgba(248, 244, 255, 0.98);
          border-color: rgba(110, 85, 165, 0.58);
          background: linear-gradient(
            165deg,
            rgba(38, 24, 62, 0.82) 0%,
            rgba(16, 10, 28, 0.88) 100%
          );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 0 14px rgba(95, 65, 150, 0.16),
            0 2px 8px rgba(0, 0, 0, 0.4);
        }

        .lb-sidebar-nav:hover:not(.lb-sidebar-nav--disabled):not(.lb-sidebar-nav--active) svg {
          opacity: 1;
          filter: drop-shadow(0 0 6px rgba(180, 150, 220, 0.35));
        }

        .lb-sidebar-nav:active:not(.lb-sidebar-nav--disabled) {
          box-shadow:
            inset 0 2px 8px rgba(0, 0, 0, 0.35),
            0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .lb-sidebar-nav:focus-visible {
          outline: none;
          border-color: rgba(175, 140, 95, 0.55);
          box-shadow:
            0 0 0 2px rgba(100, 70, 150, 0.28),
            inset 0 0 10px rgba(90, 55, 140, 0.12);
        }

        .lb-sidebar-nav--active {
          color: rgba(255, 252, 255, 0.99);
          border-color: rgba(210, 165, 105, 0.62);
          background: linear-gradient(
            155deg,
            rgba(62, 36, 98, 0.58) 0%,
            rgba(22, 14, 38, 0.88) 52%,
            rgba(10, 6, 18, 0.92) 100%
          );
          box-shadow:
            inset 0 0 14px rgba(110, 65, 170, 0.22),
            inset 0 1px 0 rgba(240, 205, 140, 0.28),
            0 0 0 1px rgba(190, 145, 90, 0.35),
            0 0 20px rgba(115, 75, 175, 0.28),
            0 3px 10px rgba(0, 0, 0, 0.45);
          animation: lb-sidebar-active-breathe 4.2s ease-in-out infinite;
        }

        .lb-sidebar-nav--active svg {
          opacity: 1;
          filter: drop-shadow(0 0 8px rgba(230, 200, 140, 0.45));
        }

        .lb-sidebar-nav--disabled {
          cursor: not-allowed;
          color: rgba(145, 135, 168, 0.78);
          border-color: rgba(42, 36, 58, 0.65);
          background: linear-gradient(
            165deg,
            rgba(18, 12, 28, 0.65) 0%,
            rgba(8, 6, 14, 0.72) 100%
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
        }

        .lb-sidebar-nav--disabled svg {
          opacity: 0.58;
        }

        .lb-soon-seal {
          margin-left: auto;
          flex-shrink: 0;
          border-radius: 0.2rem;
          border: 1px solid rgba(195, 155, 85, 0.45);
          background: linear-gradient(180deg, rgba(36, 26, 18, 0.92) 0%, rgba(14, 10, 8, 0.96) 100%);
          padding: 0.12rem 0.36rem 0.13rem;
          font-family: "Cinzel", Georgia, serif;
          font-size: clamp(0.44rem, 1.5vw, 0.5rem);
          font-weight: 700;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: rgba(222, 190, 130, 0.92);
          box-shadow:
            inset 0 1px 0 rgba(255, 220, 180, 0.08),
            0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .lb-btn-back {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          padding: clamp(0.52rem, 2vw, 0.88rem) clamp(0.65rem, 2vw, 1rem);
          border-radius: 0.65rem;
          border: 1px solid rgba(125, 95, 175, 0.5);
          font-size: clamp(0.62rem, 1.8vw, 0.75rem);
          font-weight: 700;
          letter-spacing: clamp(0.06em, 0.09em, 0.12em);
          text-transform: uppercase;
          color: rgba(232, 222, 252, 0.95);
          cursor: pointer;
          background: linear-gradient(180deg, rgba(36, 24, 58, 0.96) 0%, rgba(12, 9, 22, 0.98) 100%);
          box-shadow:
            inset 0 1px 0 rgba(186, 165, 230, 0.1),
            inset 0 -1px 0 rgba(0, 0, 0, 0.35),
            0 0 0 1px rgba(0, 0, 0, 0.35),
            0 6px 22px rgba(0, 0, 0, 0.48),
            0 0 26px rgba(75, 50, 120, 0.22);
          transition:
            transform 0.32s cubic-bezier(0.4, 0, 0.2, 1),
            border-color 0.35s ease,
            box-shadow 0.35s ease,
            color 0.28s ease;
        }

        .lb-btn-back::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.38s ease;
          background: linear-gradient(
            135deg,
            rgba(155, 170, 230, 0.22) 0%,
            transparent 42%,
            transparent 58%,
            rgba(135, 95, 185, 0.2) 100%
          );
          filter: blur(10px);
          z-index: -1;
        }

        .lb-btn-back:hover {
          border-color: rgba(165, 135, 220, 0.62);
          color: rgba(255, 252, 255, 0.99);
          box-shadow:
            inset 0 1px 0 rgba(205, 190, 255, 0.14),
            0 0 0 1px rgba(100, 70, 150, 0.2),
            0 8px 26px rgba(0, 0, 0, 0.5),
            0 0 32px rgba(110, 80, 180, 0.32),
            0 0 48px rgba(70, 45, 120, 0.14);
        }

        .lb-btn-back:hover::before {
          opacity: 0.75;
        }

        .lb-btn-back:active {
          transform: translateY(2px);
        }

        .lb-btn-back:focus-visible {
          outline: none;
          box-shadow:
            inset 0 1px 0 rgba(205, 190, 255, 0.14),
            0 0 0 2px rgba(155, 130, 200, 0.45),
            0 6px 22px rgba(0, 0, 0, 0.48);
        }

        /* Logout variant — muted danger (for Lobby / future reuse) */
        .lb-btn-logout {
          border-color: rgba(130, 55, 70, 0.55);
          color: rgba(232, 200, 204, 0.93);
          background: linear-gradient(180deg, rgba(48, 18, 24, 0.96) 0%, rgba(14, 6, 10, 0.98) 100%);
          box-shadow:
            inset 0 1px 0 rgba(200, 120, 130, 0.08),
            inset 0 -1px 0 rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(0, 0, 0, 0.38),
            0 6px 22px rgba(0, 0, 0, 0.5),
            0 0 22px rgba(90, 22, 32, 0.18);
        }

        .lb-btn-logout::before {
          background: linear-gradient(
            135deg,
            rgba(160, 50, 60, 0.18) 0%,
            transparent 45%,
            transparent 55%,
            rgba(90, 30, 40, 0.15) 100%
          );
        }

        .lb-btn-logout:hover {
          border-color: rgba(160, 72, 88, 0.58);
          color: rgba(252, 230, 232, 0.98);
          box-shadow:
            inset 0 1px 0 rgba(215, 130, 140, 0.1),
            0 0 0 1px rgba(100, 40, 50, 0.22),
            0 8px 26px rgba(0, 0, 0, 0.52),
            0 0 36px rgba(95, 28, 42, 0.28),
            0 0 52px rgba(55, 12, 22, 0.12);
        }

        .lb-pedestal {
          position: relative;
          display: flex;
          width: 100%;
          justify-content: center;
          padding: 0 0.125rem 0.35rem;
        }

        .lb-pedestal__well {
          position: absolute;
          bottom: 4%;
          left: 50%;
          transform: translateX(-50%);
          width: 78%;
          height: 32%;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(100, 60, 150, 0.28) 0%, transparent 72%);
          filter: blur(16px);
          pointer-events: none;
          z-index: 0;
        }

        .lb-pedestal__embers {
          position: absolute;
          inset: 8% 4% 14%;
          pointer-events: none;
          z-index: 1;
          opacity: 0.42;
          background-image:
            radial-gradient(circle at 18% 32%, rgba(200, 170, 255, 0.14) 0, transparent 2px),
            radial-gradient(circle at 74% 28%, rgba(180, 140, 220, 0.12) 0, transparent 1.5px),
            radial-gradient(circle at 55% 70%, rgba(160, 120, 200, 0.1) 0, transparent 1.8px),
            radial-gradient(circle at 88% 65%, rgba(190, 150, 235, 0.09) 0, transparent 1.6px),
            radial-gradient(circle at 30% 78%, rgba(170, 130, 210, 0.08) 0, transparent 1.5px);
          animation: lb-pedestal-drift 16s ease-in-out infinite;
        }

        .lb-pedestal__lift {
          position: relative;
          z-index: 2;
          transition: transform 0.36s cubic-bezier(0.4, 0, 0.2, 1);
          filter: drop-shadow(0 10px 28px rgba(25, 12, 45, 0.55));
        }

        .lb-pedestal:hover .lb-pedestal__lift {
          transform: translateY(-5px);
        }

        .lb-pedestal__lift video {
          display: block;
          transition:
            transform 0.36s cubic-bezier(0.4, 0, 0.2, 1),
            filter 0.32s ease;
        }

        .lb-pedestal:hover .lb-pedestal__lift video {
          transform: translateY(-2px) scale(1.015);
        }

        /* ── 14″ refinement: balance sidebar vs main (scaled) — only ≤1600px & ≥1024px (≥1601px unchanged) ── */
        @media (max-width: 1600px) and (min-width: 1024px) {
          .lb-dash-root .lb-dash-shell {
            padding-inline: clamp(0.32rem, 1.15vw, 1.85rem) !important;
            padding-top: clamp(0.45rem, 1.45vw, 0.95rem);
            padding-bottom: clamp(0.45rem, 1.35vw, 0.9rem);
          }
          .lb-dash-root .lb-dash-header {
            margin-bottom: clamp(0.5rem, 1.15vw, 0.92rem) !important;
          }
          .lb-dash-root > .lb-dash-bg-video {
            object-position: 50% 38%;
          }
          .lb-dash-root .lb-dash-grid {
            gap: clamp(0.22rem, 0.62vw, 1.35rem);
            grid-template-columns: minmax(7.35rem, min(238px, 15.35vw)) minmax(0, 1fr);
          }
          .lb-dash-root .lb-dash-main-stack {
            gap: clamp(0.38rem, 1.25vw, 1.52rem);
            margin-top: clamp(0.5rem, 2.85vw, 5.5rem);
            width: 100%;
            max-width: min(1185px, 100%);
            margin-inline: auto;
          }
          .lb-dash-root aside.lb-dash-aside {
            padding: clamp(0.4rem, 1.12vw, 1.08rem) clamp(0.38rem, 1.02vw, 0.95rem) !important;
          }
          /* Tighter vertical rhythm between sidebar nav links (narrow desktop only) */
          .lb-dash-root aside.lb-dash-aside > nav {
            gap: clamp(0.24rem, 0.68vw, 0.45rem) !important;
          }
          .lb-dash-root aside .lb-dash-aside-decor-stack {
            gap: clamp(0.32rem, 0.88vw, 0.78rem) !important;
          }
          .lb-dash-root aside .lb-dash-aside-foot {
            margin-top: clamp(0.42rem, 1.2vw, 1rem) !important;
            padding-top: clamp(0.38rem, 1.08vw, 0.92rem) !important;
          }
          .lb-dash-root aside .lb-sidebar-nav {
            min-height: clamp(2.65rem, 4.9vh, 2.9rem);
            padding: clamp(0.16rem, 0.5vw, 0.36rem) clamp(0.36rem, 0.92vw, 0.58rem);
            gap: clamp(0.24rem, 0.68vw, 0.44rem);
            border-radius: clamp(0.38rem, 0.85vw, 0.48rem);
            font-size: clamp(0.52rem, 1.18vw, 0.74rem);
            line-height: 1.22;
          }
          .lb-dash-root aside .lb-sidebar-nav--disabled {
            min-height: clamp(2.55rem, 4.65vh, 2.8125rem);
          }
          .lb-dash-root aside .lb-sidebar-nav svg {
            width: clamp(0.58rem, 1.5vw, 0.82rem);
            height: clamp(0.58rem, 1.5vw, 0.82rem);
          }
          .lb-dash-root aside .lb-soon-seal {
            font-size: clamp(0.3rem, 0.88vw, 0.41rem);
            padding: 0.06rem 0.2rem 0.065rem;
            letter-spacing: 0.074em;
            border-radius: 0.14rem;
          }
          .lb-dash-root aside .lb-pedestal {
            padding-bottom: 0.12rem;
          }
          .lb-dash-root aside .lb-pedestal__lift video {
            max-height: min(248px, 33vh) !important;
          }
          .lb-dash-root aside .lb-ft-motto-responsive {
            font-size: clamp(0.44rem, 1.12vw, 0.54rem) !important;
            letter-spacing: clamp(0.1em, 0.55vw, 0.22em) !important;
            line-height: 1.32 !important;
          }
          .lb-dash-root aside .lb-dash-aside-decor-stack div.text-center p + p.lb-ft-motto-responsive {
            margin-top: clamp(0.18rem, 0.52vw, 0.42rem) !important;
          }
          .lb-dash-root aside .lb-btn-back {
            padding: clamp(0.32rem, 1.12vw, 0.56rem) clamp(0.42rem, 1.28vw, 0.68rem);
            font-size: clamp(0.5rem, 1.18vw, 0.65rem);
            border-radius: 0.48rem;
            gap: clamp(0.3rem, 0.85vw, 0.44rem);
            letter-spacing: 0.07em;
          }
          .lb-dash-root aside .lb-btn-back svg {
            width: clamp(0.8rem, 1.78vw, 0.96rem);
            height: clamp(0.8rem, 1.78vw, 0.96rem);
          }
          .lb-dash-root .lb-dash-header .lobby-header-brand-word {
            font-size: clamp(0.82rem, 2.35vw, 1.72rem);
          }
          .lb-dash-root .lb-dash-header-brand-img {
            height: clamp(1.35rem, 3.1vw, 2.65rem) !important;
            width: clamp(1.35rem, 3.1vw, 2.65rem) !important;
          }
          .lb-dash-root .lb-dash-ft-display-tight {
            font-size: clamp(1.3rem, 3.05vw, 2.35rem) !important;
            letter-spacing: clamp(0.1em, 0.155em, 0.195em) !important;
          }
          .lb-dash-root .lb-dash-hero-card {
            min-height: clamp(6.65rem, 10.5vw, 14.25rem) !important;
          }
          .lb-dash-root .lb-dash-hero-inner {
            padding: clamp(0.36rem, 1.12vw, 0.95rem) !important;
            gap: clamp(0.3rem, 1vw, 1.42rem) !important;
          }
          .lb-dash-root .lb-dash-hero-inner > div:first-child {
            gap: clamp(0.3rem, 1vw, 1.12rem) !important;
          }
          .lb-dash-root .lb-dash-hero-banner {
            height: clamp(2.65rem, 5.85vw, 6.85rem) !important;
          }
          .lb-dash-root .lb-dash-hero-sub {
            margin-top: clamp(0.22rem, 0.48vw, 0.45rem) !important;
            font-size: clamp(0.64rem, 1.02vw, 0.82rem) !important;
          }
          .lb-dash-root .lb-dash-rank-box {
            max-width: min(10.5rem, 30vw) !important;
            padding: clamp(0.32rem, 0.72vw, 0.68rem) clamp(0.42rem, 1.12vw, 1.42rem) !important;
          }
          .lb-dash-root .lb-dash-rank-box .lb-ft-rank-num-responsive {
            font-size: clamp(1.1rem, 2.38vw, 1.82rem) !important;
            margin-top: clamp(0.18rem, 0.48vw, 0.48rem) !important;
          }
          .lb-dash-root .lb-dash-rank-box .lb-dash-rank-caption {
            font-size: clamp(0.54rem, 0.82vw, 0.7rem) !important;
            margin-top: clamp(0.18rem, 0.4vw, 0.42rem) !important;
          }
          .lb-dash-root .lb-dash-eligibility-outer {
            padding: clamp(0.3rem, 0.72vw, 0.48rem) clamp(0.48rem, 1.22vw, 1.22rem)
              clamp(0.48rem, 0.92vw, 1.08rem) !important;
          }
          .lb-dash-root .lb-dash-eligibility-mat {
            padding: clamp(0.4rem, 0.88vw, 0.82rem) clamp(0.5rem, 1.08vw, 1.28rem) !important;
          }
          .lb-dash-root .lb-dash-eligibility-row {
            gap: clamp(0.3rem, 0.85vw, 1.42rem) !important;
          }
          .lb-dash-root .lb-dash-eligibility-copy {
            gap: clamp(0.3rem, 0.85vw, 1.12rem) !important;
          }
          .lb-dash-root .lb-dash-eligibility-copy img {
            height: clamp(1.85rem, 3.15vw, 3.45rem) !important;
          }
          .lb-dash-root .lb-dash-eligibility-epic {
            font-size: clamp(0.98rem, 1.88vw, 1.35rem) !important;
            margin-top: clamp(0.18rem, 0.38vw, 0.4rem) !important;
          }
          .lb-dash-root .lb-dash-eligibility-side {
            gap: clamp(0.3rem, 0.68vw, 0.88rem) !important;
            padding-left: clamp(0.45rem, 1.02vw, 1rem) !important;
          }
          .lb-dash-root .lb-dash-eligibility-side > div:first-child {
            width: clamp(1.62rem, 2.45vw, 2.28rem) !important;
            height: clamp(1.62rem, 2.45vw, 2.28rem) !important;
          }
          .lb-dash-root .lb-dash-eligibility-clock {
            width: clamp(0.78rem, 1.18vw, 1.28rem) !important;
            height: clamp(0.78rem, 1.18vw, 1.28rem) !important;
          }
          .lb-dash-root .lb-dash-eligibility-row .lb-dash-eligibility-rules {
            margin-top: clamp(0.2rem, 0.42vw, 0.55rem) !important;
            font-size: clamp(0.62rem, 0.88vw, 0.78rem) !important;
          }
          .lb-dash-root .lb-dash-rankings-frame-wrap {
            padding: clamp(0.38rem, 0.92vw, 0.92rem) !important;
          }
          .lb-dash-root .lb-rankings-table {
            font-size: clamp(0.62rem, 1.22vw, 0.8rem);
          }
          .lb-dash-root .lb-table-cell {
            padding: clamp(0.32rem, 0.65vw, 0.55rem) clamp(0.36rem, 0.92vw, 0.72rem);
          }
          .lb-dash-root .lb-rankings-table thead .lb-table-cell {
            padding-top: clamp(0.4rem, 0.82vw, 0.62rem);
            padding-bottom: clamp(0.32rem, 0.65vw, 0.5rem);
          }
          .lb-dash-root .lb-rankings-table tbody .lb-table-cell.lb-rankings-message {
            padding: clamp(0.92rem, 1.95vw, 1.55rem) clamp(0.65rem, 1.35vw, 1.08rem);
          }
          .lb-dash-root .lb-ft-footnote.lb-dash-table-footnote {
            margin-top: clamp(0.52rem, 1.12vw, 0.88rem) !important;
            letter-spacing: 0.14em;
          }
        }

        @media (max-width: 1512px) and (min-width: 1024px) {
          .lb-dash-root .lb-dash-grid {
            grid-template-columns: minmax(7.1rem, min(224px, 15.25vw)) minmax(0, 1fr);
            gap: clamp(0.18rem, 0.52vw, 1.12rem);
          }
          .lb-dash-root .lb-dash-main-stack {
            margin-top: clamp(0.42rem, 2.35vw, 4.85rem);
            max-width: min(1105px, 100%);
          }
          .lb-dash-root aside.lb-dash-aside > nav {
            gap: clamp(0.2rem, 0.62vw, 0.42rem) !important;
          }
          .lb-dash-root aside .lb-sidebar-nav {
            min-height: clamp(2.625rem, 4.75vh, 2.875rem);
            padding: clamp(0.14rem, 0.45vw, 0.34rem) clamp(0.34rem, 0.82vw, 0.54rem);
            font-size: clamp(0.5rem, 1.1vw, 0.71rem);
          }
          .lb-dash-root aside .lb-sidebar-nav--disabled {
            min-height: clamp(2.5rem, 4.42vh, 2.6875rem);
          }
          .lb-dash-root aside .lb-pedestal__lift video {
            max-height: min(232px, 31vh) !important;
          }
          .lb-dash-root .lb-dash-ft-display-tight {
            font-size: clamp(1.22rem, 2.92vw, 2.12rem) !important;
            letter-spacing: clamp(0.095em, 0.14em, 0.185em) !important;
          }
          .lb-dash-root .lb-dash-hero-card {
            min-height: clamp(6.15rem, 9.85vw, 12.75rem) !important;
          }
          .lb-dash-root > .lb-dash-bg-video {
            object-position: 50% 36%;
          }
          .lb-dash-root .lb-rankings-mat-inner {
            -webkit-overflow-scrolling: touch;
          }
        }

        @media (max-width: 1440px) and (min-width: 1024px) {
          .lb-dash-root .lb-dash-grid {
            grid-template-columns: minmax(6.95rem, min(214px, 15.1vw)) minmax(0, 1fr);
            gap: clamp(0.16rem, 0.48vw, 1.02rem);
          }
          .lb-dash-root .lb-dash-main-stack {
            max-width: min(1040px, 100%);
          }
          .lb-dash-root .lb-dash-ft-display-tight {
            font-size: clamp(1.12rem, 2.72vw, 1.92rem) !important;
          }
          .lb-dash-root aside .lb-sidebar-nav svg {
            width: clamp(0.56rem, 1.38vw, 0.76rem);
            height: clamp(0.56rem, 1.38vw, 0.76rem);
          }
          .lb-dash-root aside .lb-soon-seal {
            font-size: clamp(0.28rem, 0.82vw, 0.38rem);
            padding: 0.05rem 0.17rem 0.052rem;
          }
          .lb-dash-root aside .lb-pedestal__lift video {
            max-height: min(218px, 29.5vh) !important;
          }
          .lb-dash-root aside .lb-btn-back {
            padding: clamp(0.3rem, 1.05vw, 0.52rem) clamp(0.4rem, 1.15vw, 0.62rem);
            font-size: clamp(0.48rem, 1.1vw, 0.61rem);
          }
          .lb-dash-root .lb-dash-eligibility-epic {
            font-size: clamp(0.92rem, 1.72vw, 1.26rem) !important;
          }
          .lb-dash-root .lb-dash-rankings-frame-wrap {
            padding: clamp(0.34rem, 0.85vw, 0.85rem) !important;
          }
        }

        @media (max-width: 1280px) and (min-width: 1024px) {
          .lb-dash-root .lb-dash-grid {
            grid-template-columns: minmax(6.85rem, min(206px, 15.55vw)) minmax(0, 1fr);
            gap: clamp(0.14rem, 0.42vw, 0.92rem);
          }
          .lb-dash-root .lb-dash-shell {
            padding-inline: clamp(0.26rem, 0.95vw, 1.35rem) !important;
          }
          .lb-dash-root .lb-dash-main-stack {
            max-width: min(960px, 100%);
          }
          .lb-dash-root .lb-dash-ft-display-tight {
            font-size: clamp(1.02rem, 2.55vw, 1.78rem) !important;
            letter-spacing: clamp(0.09em, 0.13em, 0.17em) !important;
          }
          .lb-dash-root aside.lb-dash-aside {
            padding: clamp(0.36rem, 0.92vw, 0.92rem) clamp(0.34rem, 0.78vw, 0.68rem) !important;
          }
          .lb-dash-root aside .lb-sidebar-nav {
            min-height: clamp(2.5625rem, 4.35vh, 2.8125rem);
            border-radius: 0.36rem;
            font-size: clamp(0.48rem, 1.06vw, 0.67rem);
          }
          .lb-dash-root aside .lb-sidebar-nav--disabled {
            min-height: clamp(2.4375rem, 4.12vh, 2.625rem);
          }
          .lb-dash-root aside .lb-ft-motto-responsive {
            font-size: clamp(0.42rem, 1.06vw, 0.52rem) !important;
            letter-spacing: clamp(0.095em, 0.52vw, 0.21em) !important;
          }
          .lb-dash-root aside .lb-pedestal__lift video {
            max-height: min(206px, 28vh) !important;
          }
          .lb-dash-root .lb-dash-hero-banner {
            height: clamp(2.45rem, 5.35vw, 6.2rem) !important;
          }
          .lb-dash-root .lb-dash-rank-box {
            max-width: min(9.75rem, 32vw) !important;
          }
          .lb-dash-root > .lb-dash-bg-video {
            object-position: 50% 34%;
          }
        }

        /* 1237×909 and similar: same band as ≤1280; extra tuck for shortest laptop heights */
        @media (max-width: 1240px) and (min-width: 1024px) {
          .lb-dash-root .lb-dash-grid {
            gap: clamp(0.12rem, 0.38vw, 0.85rem);
          }
          .lb-dash-root .lb-dash-main-stack {
            max-width: min(930px, 100%);
            gap: clamp(0.34rem, 1.12vw, 1.42rem);
          }
          .lb-dash-root .lb-dash-hero-card {
            min-height: clamp(5.75rem, 9.2vw, 11.5rem) !important;
          }
          .lb-dash-root aside .lb-pedestal__lift video {
            max-height: min(188px, 26vh) !important;
          }
        }

      `}</style>

      {/* Full-screen background: single play on page entry (muted autoplay) */}
      <video
        key={LEADERBOARD_BACKGROUND_VIDEO_URL}
        className="lb-dash-bg-video pointer-events-none absolute inset-0 z-0 h-full min-h-full w-full min-w-full object-cover"
        aria-hidden
        muted
        autoPlay
        playsInline
        preload="auto"
        src={LEADERBOARD_BACKGROUND_VIDEO_URL}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#05050f]/84 via-[#070614]/82 to-[#030308]/90"
        aria-hidden
      />
      <div
        className="lb-glow-orbs pointer-events-none absolute inset-0 z-[2] opacity-50"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 20%, rgba(88, 28, 135, 0.22), transparent 55%), radial-gradient(circle at 15% 70%, rgba(59, 130, 246, 0.12), transparent 40%), radial-gradient(circle at 88% 60%, rgba(139, 92, 246, 0.1), transparent 42%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-b from-[#05050f]/55 via-transparent to-[#030308]/88" aria-hidden />

      <div className="lb-dash-shell relative z-10 flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-auto overflow-y-auto px-[clamp(0.5rem,2.2vw,2.5rem)] pb-3 pt-3 md:pb-5">
        {/* Brand only — top glass toolbar removed */}
        <header className="lb-dash-header mb-3 shrink-0 md:mb-5">
          <div className="flex flex-nowrap items-center gap-x-2 gap-y-1 sm:gap-x-4">
            <span className="lobby-header-brand-word shrink-0">CARD</span>
            <img
              src={LOBBY_LOGO_ICON_URL}
              alt=""
              className="lb-dash-header-brand-img h-[clamp(1.65rem,3.8vw,3.05rem)] w-[clamp(1.65rem,3.8vw,3.05rem)] shrink-0 object-contain drop-shadow-[0_0_24px_rgba(139,92,246,0.5)]"
              aria-hidden
            />
            <span className="lobby-header-brand-word shrink-0">ROGUE</span>
          </div>
        </header>

        <div className="lb-dash-grid grid min-h-0 min-w-0 max-w-full flex-1 grid-cols-[minmax(6.75rem,17vw)_minmax(0,1fr)] gap-2 pb-3 sm:gap-3 md:gap-5 lg:gap-7 xl:gap-11">
          <aside
            className={`lb-dash-aside ${leaderboardAsideSurface} ${padStd} flex min-h-0 min-w-0 flex-col overflow-y-auto`}
          >
            <nav className="flex shrink-0 flex-col gap-2">
              <NavLink
                end
                to="/lobby"
                className={({ isActive }) =>
                  `lb-sidebar-nav${isActive ? ' lb-sidebar-nav--active' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <SidebarIconLobby active={isActive} />
                    Lobby
                  </>
                )}
              </NavLink>
              <NavLink
                to="/leaderboard"
                className={({ isActive }) =>
                  `lb-sidebar-nav${isActive ? ' lb-sidebar-nav--active' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <SidebarIconTrophy active={isActive} />
                    Leaderboard
                  </>
                )}
              </NavLink>
              <NavLink
                to={profilePath}
                className={({ isActive }) =>
                  `lb-sidebar-nav${isActive ? ' lb-sidebar-nav--active' : ''}`
                }
              >
                <SidebarIconUser />
                Profile
              </NavLink>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="lb-sidebar-nav lb-sidebar-nav--disabled text-left"
              >
                <SidebarIconAchievement />
                Achievements
                <span className="lb-soon-seal">Soon</span>
              </button>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="lb-sidebar-nav lb-sidebar-nav--disabled text-left"
              >
                <SidebarIconSettings />
                Settings
                <span className="lb-soon-seal">Soon</span>
              </button>
            </nav>

            {/* Spacer + card highlight — same block as desktop at all widths (scaled) */}
            <div className="lb-dash-aside-decor-stack flex min-h-0 flex-1 flex-col gap-2 md:gap-4" aria-hidden>
              <div className="min-h-[0.5rem] flex-1 md:min-h-[1.25rem]" />
              <div className="lb-pedestal">
                <div className="lb-pedestal__well" aria-hidden />
                <div className="lb-pedestal__embers" aria-hidden />
                <div className="lb-pedestal__lift w-full">
                  <video
                    className="mx-auto h-auto w-full max-w-full object-contain"
                    style={{ maxHeight: 'min(360px, 45vh)' }}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    src={LEADERBOARD_ANIM_URL}
                    aria-label="Leaderboard highlight"
                  />
                </div>
              </div>
              <div className="pb-0.5 text-center md:pb-1">
                <p className="lb-ft-motto-responsive lb-ft-motto uppercase font-normal leading-snug text-white/92" style={{ fontSize: 'clamp(0.55rem, 1.8vw, 0.6875rem)' }}>
                  Master the cards
                </p>
                <p className="lb-ft-motto-responsive lb-ft-motto mt-1 font-normal leading-snug text-white/88 md:mt-1.5" style={{ fontSize: 'clamp(0.55rem, 1.8vw, 0.6875rem)' }}>
                  Conquer the darkness
                </p>
              </div>
            </div>

            <div className="lb-dash-aside-foot mt-[clamp(0.65rem,1.8vw,1.75rem)] shrink-0 border-t border-white/10 pt-[clamp(0.65rem,1.8vw,1.5rem)]">
              <button
                type="button"
                onClick={() => navigate('/lobby')}
                title="Back to Lobby"
                className="lb-btn-back font-sans"
              >
                <span aria-hidden>
                  <SidebarIconBack iconClass="h-[1.0625rem] w-[1.0625rem] shrink-0" />
                </span>
                Back
              </button>
            </div>
          </aside>

          {/* Main leaderboard column */}
          <section className="lb-dash-main-stack mt-[clamp(1rem,5vw,9rem)] flex min-h-0 min-w-0 flex-col gap-2 md:gap-4 lg:gap-5">
            {/* Rankings hero — navy matte + gold frame (PvE leaderboard reference) */}
            <div
              className="lb-dash-hero-card overflow-visible rounded-xl border border-[#c89b3c]/70 bg-black/[0.52] shadow-[0_28px_64px_-20px_rgba(0,0,0,0.82),inset_0_1px_0_rgba(200,155,60,0.15)]"
              style={{ minHeight: 'clamp(8.5rem, 14vw, 18rem)' }}
            >
              <div className="lb-dash-hero-inner flex min-w-0 flex-row flex-nowrap items-start justify-between gap-2 p-[clamp(0.65rem,1.8vw,1.5rem)] md:gap-3 lg:gap-6">
                <div className="flex min-w-0 flex-1 gap-2 md:gap-3 lg:gap-5">
                  <img
                    src={LEADERBOARD_HEADER_ICON_URL}
                    alt=""
                    draggable={false}
                    className="lb-dash-hero-banner w-auto shrink-0 select-none object-contain object-bottom drop-shadow-[0_6px_28px_rgba(200,155,60,0.25)]"
                    style={{ height: 'clamp(3.5rem, 7.5vw, 9rem)' }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h1 className="lb-ft-display lb-dash-ft-display-tight">PVE Leaderboard</h1>
                    <p className="lb-dash-hero-sub mt-1 max-w-xl font-sans leading-relaxed text-[#a0aec8]" style={{ fontSize: 'clamp(0.75rem, 1.35vw, 0.9375rem)' }}>
                      See how you rank against other players.
                    </p>
                  </div>
                </div>
                <div
                  className="lb-dash-rank-box ml-0.5 max-w-[min(13.5rem,38vw)] shrink-0 self-start rounded-lg border border-[#c89b3c]/90 bg-[#0a0a0c] text-center shadow-[inset_0_1px_0_rgba(200,155,60,0.14),0_14px_40px_-14px_rgba(0,0,0,0.55)]"
                  style={{ padding: 'clamp(0.5rem, 1.1vw, 1.1rem) clamp(0.65rem, 2vw, 2.25rem)' }}
                >
                  <p className={lbGoldCaps}>My rank</p>
                  <div className="lb-ft-rank-num lb-ft-rank-num-responsive font-bold tabular-nums leading-none tracking-tight text-white" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.375rem)', marginTop: 'clamp(0.35rem, 0.9vw, 0.75rem)' }}>
                    {myRank.kind === 'listed' ? (
                      `#${myRank.rank}`
                    ) : myRank.kind === 'loading' || leaderboardLoading ? (
                      <span aria-hidden className="text-white/85">
                        …
                      </span>
                    ) : (
                      <span className="text-white/82">—</span>
                    )}
                  </div>
                  <p className="lb-dash-rank-caption mt-2 font-sans leading-snug text-[#92a4c9]" style={{ fontSize: 'clamp(0.68rem, 1vw, 0.8rem)', marginTop: 'clamp(0.35rem, 0.6vw, 0.625rem)' }}>
                    {myRank.kind === 'leaderboard_failed' && (myRank.message || 'Leaderboard unavailable.')}
                    {myRank.kind === 'guest' && 'Sign in to track your rank'}
                    {myRank.kind === 'loading' && 'Loading your standing…'}
                    {myRank.kind === 'listed' &&
                      `${formatWinRate(myRank.winRate)} win rate · ${myRank.totalGames} games`}
                    {myRank.kind === 'outside_top' &&
                      `Qualified · not on this page (${formatWinRate(myRank.winRate)} · ${myRank.totalGames} games)`}
                    {myRank.kind === 'ineligible' &&
                      (myRank.totalGames === 0
                        ? `No ranked games yet — play ${myRank.needGames} more to qualify`
                        : `${myRank.totalGames} game${myRank.totalGames === 1 ? '' : 's'} played — ${myRank.needGames} more to qualify`)}
                    {myRank.kind === 'stats_error' && 'Could not load your stats. Try again later.'}
                    {myRank.kind === 'idle' && !leaderboardLoading && 'Not ranked yet'}
                  </p>
                </div>
              </div>

              <div
                className="mb-px h-px bg-gradient-to-r from-transparent via-[#c89b3c]/45 to-transparent"
                style={{ marginInline: 'clamp(0.75rem, 2vw, 2rem)' }}
              />

              <div className="lb-dash-eligibility-outer" style={{ padding: 'clamp(0.5rem, 1vw, 0.75rem) clamp(0.75rem, 2vw, 1.75rem) clamp(1rem, 1.8vw, 1.75rem)' }}>
                <div
                  className="lb-dash-eligibility-mat relative mx-auto border border-[#c89b3c]/60 bg-[linear-gradient(152deg,#0c0c10_0%,#0a0a0c_50%,#08080b_100%)] shadow-[inset_0_0_0_1px_rgba(200,155,60,0.09),inset_0_1px_0_rgba(255,255,255,0.035)]"
                  style={{ padding: 'clamp(0.65rem, 1.2vw, 1.25rem) clamp(0.75rem, 1.6vw, 2rem)' }}
                >
                  <div className="lb-dash-eligibility-row flex flex-row flex-nowrap items-center justify-between gap-2 md:gap-6 lg:gap-8 lg:pr-4">
                    <div className="lb-dash-eligibility-copy flex min-w-0 flex-1 items-start gap-2 md:gap-4 lg:gap-6 lg:pr-5">
                      <div
                        className="relative z-[2] mt-0.5 flex shrink-0 items-center justify-center"
                        aria-hidden
                      >
                        <img
                          src={LEADERBOARD_CUP_URL}
                          alt=""
                          draggable={false}
                          style={{ height: 'clamp(2.5rem, 4.5vw, 5rem)' }}
                          className="w-auto object-contain object-center drop-shadow-[0_4px_22px_rgba(200,155,60,0.22)]"
                        />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className={lbGoldCaps}>Eligibility</p>
                        <h2 className="lb-ft-epic-line lb-dash-eligibility-epic mt-1">
                          Climb the ranks and prove your mastery!
                        </h2>
                        <p className="lb-dash-eligibility-rules mt-1.5 font-sans leading-relaxed text-[#9aa8cb]" style={{ fontSize: 'clamp(0.78rem, 1.1vw, 0.9375rem)' }}>
                          Only players with 10 or more games are ranked.
                        </p>
                      </div>
                    </div>
                    <div className="lb-dash-eligibility-side flex shrink-0 items-center gap-1.5 border-l border-[#c89b3c]/35 pl-2 md:gap-2.5 md:pl-4 lg:gap-4 lg:pl-6">
                      <div
                        className="flex shrink-0 items-center justify-center rounded-full border border-[#c89b3c]/85 bg-[#0a0a0c] shadow-[inset_0_0_0_1px_rgba(200,155,60,0.12)]"
                        style={{ width: 'clamp(2rem, 3vw, 2.875rem)', height: 'clamp(2rem, 3vw, 2.875rem)' }}
                        aria-hidden
                      >
                        <LeaderboardClockGlyph
                          style={{ width: 'clamp(1rem, 1.5vw, 1.5rem)', height: 'clamp(1rem, 1.5vw, 1.5rem)' }}
                          className="lb-dash-eligibility-clock text-[#c89b3c]"
                        />
                      </div>
                      <p className={`${lbGoldCaps} lb-ft-gold-caps--compact max-w-[10rem] leading-snug lg:max-w-[12rem]`}>
                        Rankings update in real time
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Leaderboard: live rankings from GET /api/leaderboard */}
            <div
              className={`lb-dash-rankings-frame-wrap ${leaderboardRankingsFrame} flex min-h-0 flex-col`}
              style={{ padding: 'clamp(0.65rem, 1.4vw, 1.35rem)' }}
            >
              <div className={`${leaderboardRankingsMat} lb-rankings-mat-inner overflow-x-auto`} aria-busy={leaderboardLoading}>
                <table className="lb-rankings-table w-full min-w-[min(460px,100%)] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#c89b3c]/35 bg-[rgba(12,11,14,0.94)]">
                      {['Rank', 'Player', 'Games', 'Wins', 'WIN RATE'].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="lb-ft-table-th lb-table-cell first:rounded-tl-[0.45rem] last:rounded-tr-[0.45rem]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardLoading && (
                      <tr className="border-b border-[#c89b3c]/[0.08] bg-[rgba(12,11,14,0.42)]">
                        <td className="lb-table-cell lb-rankings-message text-center font-sans text-[#9aa8cb]" colSpan={5}>
                          Loading rankings…
                        </td>
                      </tr>
                    )}
                    {!leaderboardLoading && leaderboardError && (
                      <tr className="border-b border-[#c89b3c]/[0.08] bg-[rgba(12,11,14,0.42)]">
                        <td className="lb-table-cell lb-rankings-message text-center" colSpan={5}>
                          <p className="font-sans text-sm text-rose-200/90">{leaderboardError}</p>
                          <button
                            type="button"
                            className="mt-4 rounded-lg border border-[#c89b3c]/55 bg-black/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#e8dcc8] transition hover:border-[#dfc78a]/85 hover:bg-black/75"
                            onClick={loadLeaderboard}
                          >
                            Retry
                          </button>
                        </td>
                      </tr>
                    )}
                    {!leaderboardLoading && !leaderboardError && rankings.length === 0 && (
                      <tr className="border-b border-[#c89b3c]/[0.08] bg-[rgba(12,11,14,0.42)]">
                        <td className="lb-table-cell lb-rankings-message text-center font-sans leading-relaxed text-[#9aa8cb]" colSpan={5}>
                          No eligible players yet. Win rate rankings require at least 10 finished games per player.
                        </td>
                      </tr>
                    )}
                    {!leaderboardLoading &&
                      !leaderboardError &&
                      rankings.map((entry) => {
                        const rank = entry.rank;
                        const medal = rank <= 3 ? RANK_ROW_STYLES[rank] : null;
                        const uid = user?.id != null ? String(user.id) : null;
                        const isSelf = uid != null && String(entry.userId) === uid;
                        return (
                          <tr
                            key={`${rank}-${entry.userId}`}
                            className={`lb-row-base border-b border-[#c89b3c]/[0.08] last:border-b-0${medal ? ' lb-row-podium' : ''}${isSelf ? ' bg-[rgba(200,155,90,0.08)] ring-1 ring-inset ring-[#c89b3c]/40' : ''}`}
                            style={
                              medal
                                ? {
                                    borderBottom: '1px solid rgba(200,155,60,0.1)',
                                    borderLeft: medal.border,
                                    borderRight: medal.border,
                                    borderTop: medal.border,
                                    boxShadow: medal.boxShadow,
                                    backgroundImage: medal.bg,
                                    backgroundRepeat: 'no-repeat',
                                  }
                                : {
                                    borderLeft: '1px solid transparent',
                                    borderRight: '1px solid transparent',
                                    borderTop: '1px solid transparent',
                                    backgroundColor: isSelf ? undefined : 'rgba(14, 12, 10, 0.42)',
                                  }
                            }
                          >
                            <td className="lb-table-cell align-middle">
                              <span className="lb-ft-rank-num inline-flex min-w-[1.75rem] items-center gap-2 font-bold tabular-nums text-[#f0e6d8] sm:gap-2.5">
                                {rank <= 3 && (
                                  <img
                                    src={LEADERBOARD_RANK_IMG[rank]}
                                    alt=""
                                    className="h-8 w-auto max-w-[2.25rem] object-contain object-left drop-shadow-[0_0_8px_rgba(255,220,140,0.25)] sm:h-10"
                                    aria-hidden
                                  />
                                )}
                                {rank}
                              </span>
                            </td>
                            <td className="lb-table-cell align-middle">
                              <span className="font-medium text-[#dfe6f2] tabular-nums">
                                {entry.username ?? '—'}
                              </span>
                            </td>
                            <td className="lb-table-cell align-middle tabular-nums text-[#c4c9d8]">
                              {entry.totalGames ?? '—'}
                            </td>
                            <td className="lb-table-cell align-middle tabular-nums text-[#c4c9d8]">
                              {entry.totalWins ?? '—'}
                            </td>
                            <td className="lb-table-cell align-middle">
                              <span className="lb-winrate-cell font-bold tabular-nums text-[#e8dcc8]">
                                {formatWinRate(entry.winRate)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <p className="lb-ft-footnote lb-dash-table-footnote mt-4 px-3 text-center sm:px-4">
                {leaderboardLoading
                  ? `Loading · Top ${LEADERBOARD_PAGE_LIMIT} by win rate · Minimum 10 games required`
                  : leaderboardError
                    ? `Showing top ${LEADERBOARD_PAGE_LIMIT} by win rate · Minimum 10 games required`
                    : `Showing ${rankings.length} of ${rankedTotal} ranked player${rankedTotal === 1 ? '' : 's'} (page capped at ${LEADERBOARD_PAGE_LIMIT}) · Minimum 10 games required`}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
