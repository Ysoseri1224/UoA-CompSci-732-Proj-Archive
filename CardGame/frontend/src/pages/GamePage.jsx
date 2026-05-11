// src/pages/GamePage.jsx
import Battlefield from '../components/game/Battlefield';
import HandArea from '../components/game/HandArea';
import ScorePanel from '../components/game/ScorePanel';
import SkillBar from '../components/game/SkillBar';
import { useGameLogic } from '../hooks/useGameLogic';
import { useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const BOSS_ATTACK_UX_FALLBACK_MS = 12_500;

/** Mirror Battlefield boss-attack detection: phase edge or fallback battlePhase banner when phase unset. */
function detectBossAttackEntrance(prevPhase, phase, prevBattlePhase, battlePhase) {
  const phaseUnset = !(typeof phase === 'string') || phase.trim() === '';
  const enteredBossAttackPhase =
    phase === 'BOSS_ATTACK' && prevPhase !== 'BOSS_ATTACK';
  const enteredBossBattleBanner =
    phaseUnset &&
    battlePhase === 'boss' &&
    prevBattlePhase !== 'boss';
  return enteredBossAttackPhase || enteredBossBattleBanner;
}

export default function GamePage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const {
    hand,
    deckCount,
    selected,
    toggleSelect,
    evaluation,
    discardSelected,
    discards,
    maxDiscards,
    canDiscard,
    canPlay,
    playHand,
    round,
    totalScore,
    lastScore,
    playerHp,
    playerMaxHp,
    bossHp,
    bossMaxHp,
    bossName,
    floor,
    gameOver,
    restartGame,
    battlePhase,
    phase,
    attackEffect,
    skillCharges,
    maxCharges,
    skillCooldowns,
    shieldActive,
    skillChangeColor,
    skillChangeCost,
    skillActivateShield,
    connectionStatus,
    errorMessage,
  } = useGameLogic(roomId);

  /** Authoritative HP from server / hook — never mutated for UX. */
  const truthHpRef = useRef(playerHp);
  truthHpRef.current = playerHp;

  /** Player HP drawn in HUD until boss-attack.mp4 completes; mirrors truth when not held. */
  const [displayedPlayerHp, setDisplayedPlayerHp] = useState(() => playerHp);
  /** While true: hide defeat overlay until boss attack presentation flushes (win overlay ignores this). */
  const [bossAttackPresentationHold, setBossAttackPresentationHold] = useState(false);
  /** Victory overlay gated until boss-hit.mp4 ends (truth `gameOver` may already be `win`). */
  const [winRevealUnlocked, setWinRevealUnlocked] = useState(true);

  /** When true: skip syncing displayedPlayerHp from truth (during boss attack clip). */
  const holdHpSyncDuringBossAttackRef = useRef(false);
  /** displayedPlayerHp snapshot at boss attack UX start — for damage delta after video. */
  const displayedHpSnapAtBossAttackRef = useRef(displayedPlayerHp);

  /** displayed HP each render — boss-attack layout reads without adding effect deps. */
  const displayedPlayerHpLiveRef = useRef(displayedPlayerHp);
  displayedPlayerHpLiveRef.current = displayedPlayerHp;

  const prevPhaseGpRef = useRef(phase);
  const prevBattlePhaseGpRef = useRef(battlePhase);
  const fallbackBossAttackUxTimerRef = useRef(null);
  /** Guards duplicate flush (video ended + watchdog). */
  const bossAttackUxFlushedRef = useRef(true);

  /** When match ends and user dismisses overlay, tear down deferred boss UX. */
  const prevEndedMatchRef = useRef(gameOver);

  /** Float + shake after attack video applies displayed HP drop. */
  const [playerDamageFlash, setPlayerDamageFlash] = useState(null);
  const [playerHudShakeNonce, setPlayerHudShakeNonce] = useState(0);

  useEffect(() => {
    if (gameOver !== 'win') {
      setWinRevealUnlocked(true);
      return undefined;
    }
    setWinRevealUnlocked(false);
    const t = window.setTimeout(() => setWinRevealUnlocked(true), 14_000);
    return () => window.clearTimeout(t);
  }, [gameOver]);

  const revealWinOverlayAfterBossHit = useCallback(() => {
    setWinRevealUnlocked(true);
  }, []);

  const clearBossFallbackTimer = useCallback(() => {
    if (fallbackBossAttackUxTimerRef.current !== null) {
      window.clearTimeout(fallbackBossAttackUxTimerRef.current);
      fallbackBossAttackUxTimerRef.current = null;
    }
  }, []);

  const flushBossAttackPresentation = useCallback(() => {
    if (bossAttackUxFlushedRef.current) return;
    bossAttackUxFlushedRef.current = true;

    clearBossFallbackTimer();
    holdHpSyncDuringBossAttackRef.current = false;
    const snap = displayedHpSnapAtBossAttackRef.current;
    const truth = truthHpRef.current;
    const dmg = Math.max(0, Math.round(snap - truth));

    setDisplayedPlayerHp(truth);
    setBossAttackPresentationHold(false);

    if (dmg > 0) {
      setPlayerHudShakeNonce((n) => n + 1);
      setPlayerDamageFlash({ id: Date.now(), amount: dmg });
    }
  }, [clearBossFallbackTimer]);

  useEffect(() => {
    if (!playerDamageFlash) return undefined;
    const t = window.setTimeout(() => setPlayerDamageFlash(null), 1300);
    return () => window.clearTimeout(t);
  }, [playerDamageFlash]);

  useEffect(() => {
    if (holdHpSyncDuringBossAttackRef.current) return;
    setDisplayedPlayerHp(playerHp);
  }, [playerHp]);

  useLayoutEffect(() => {
    const prevPh = prevPhaseGpRef.current;
    const prevBp = prevBattlePhaseGpRef.current;
    const entered = detectBossAttackEntrance(prevPh, phase, prevBp, battlePhase);
    prevPhaseGpRef.current = phase;
    prevBattlePhaseGpRef.current = battlePhase;

    if (!entered) return;

    bossAttackUxFlushedRef.current = false;
    holdHpSyncDuringBossAttackRef.current = true;
    displayedHpSnapAtBossAttackRef.current = displayedPlayerHpLiveRef.current;
    setBossAttackPresentationHold(true);

    clearBossFallbackTimer();
    fallbackBossAttackUxTimerRef.current = window.setTimeout(() => {
      fallbackBossAttackUxTimerRef.current = null;
      flushBossAttackPresentation();
    }, BOSS_ATTACK_UX_FALLBACK_MS);
  }, [phase, battlePhase, clearBossFallbackTimer, flushBossAttackPresentation]);

  /** Room change: tear down deferred UX held over from prior session (same tab). */
  useEffect(() => {
    prevPhaseGpRef.current = phase;
    prevBattlePhaseGpRef.current = battlePhase;
    clearBossFallbackTimer();
    holdHpSyncDuringBossAttackRef.current = false;
    bossAttackUxFlushedRef.current = true;
    setBossAttackPresentationHold(false);
    setWinRevealUnlocked(true);
    setDisplayedPlayerHp(truthHpRef.current);
    // Sync only room navigation; stale phase/playerHp closure is intentional on id change edge.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only roomId triggers full presentation reset
  }, [roomId]);

  /** Local restart clears match — reset deferral so the next encounter is not blocked. */
  useEffect(() => {
    const prev = prevEndedMatchRef.current;
    prevEndedMatchRef.current = gameOver;
    const wasTerminal = prev === 'win' || prev === 'lose';
    if (!wasTerminal || gameOver != null) return;
    clearBossFallbackTimer();
    holdHpSyncDuringBossAttackRef.current = false;
    bossAttackUxFlushedRef.current = true;
    setBossAttackPresentationHold(false);
    setWinRevealUnlocked(true);
    setDisplayedPlayerHp(truthHpRef.current);
  }, [gameOver, clearBossFallbackTimer]);
  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 70% at 50% 30%, #1a1608, #080604)',
        top: 0, zIndex: 50,
      }}
    >

      {/* ── Top bar: stats stay centered; Exit + Settings grouped on the right ── */}
      <header
        className="flex min-h-12 flex-shrink-0 items-stretch border-b border-yellow-900/40
                   bg-gradient-to-b from-stone-950 to-transparent px-2 py-1.5 sm:px-4 md:px-5"
      >
        <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <div className="shrink-0 font-mono text-[10px] tracking-widest text-yellow-600 sm:text-xs">
            CARD&nbsp;&nbsp;ROGUE
          </div>
          <div
            className="flex min-w-0 flex-1 basis-[50%] flex-wrap items-center justify-center gap-x-2
                       gap-y-0.5 sm:gap-x-4 md:basis-auto"
          >
            <span className="whitespace-nowrap font-mono text-[10px] tracking-widest text-stone-500 sm:text-[11px]">
              {connectionStatus.toUpperCase()}
            </span>
            <span className="whitespace-nowrap font-mono text-[10px] tracking-widest text-yellow-900 sm:text-xs">
              ROUND&nbsp;{round}
            </span>
            <span className="whitespace-nowrap font-mono text-[10px] tracking-widest text-yellow-900 sm:text-xs">
              FLOOR&nbsp;{floor}
            </span>
            <span className="whitespace-nowrap font-mono text-[10px] tracking-widest text-yellow-700 sm:text-xs">
              SCORE&nbsp;{totalScore.toLocaleString()}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              aria-label="Exit to lobby"
              title="Return to lobby"
              onClick={() => navigate('/lobby')}
              className="whitespace-nowrap rounded border border-amber-900/55 bg-stone-950/60 px-2 py-1
                         text-[10px] font-medium text-amber-100/95 transition-colors
                         hover:border-amber-700/70 hover:bg-amber-950/35 sm:px-3 sm:text-xs"
            >
              Exit
            </button>
            <button
              type="button"
              className="whitespace-nowrap rounded border border-stone-800 px-2 py-1 text-[10px]
                         text-stone-600 transition-colors hover:text-stone-400 sm:px-3 sm:text-xs"
            >
              ⚙&nbsp;Settings
            </button>
          </div>
        </div>
      </header>

      {/* ── 主体 ── */}
	      <div className="relative z-0 flex flex-1 overflow-hidden">

	        <SkillBar
	          hand={hand}
	          skillCharges={skillCharges}
	          maxCharges={maxCharges}
	          skillCooldowns={skillCooldowns}
              shieldActive={shieldActive}
	          skillChangeColor={skillChangeColor}
	          skillChangeCost={skillChangeCost}
	          skillActivateShield={skillActivateShield}
        />

        <Battlefield
          bossHp={bossHp}
          bossMaxHp={bossMaxHp}
          bossName={bossName}
          floor={floor}
          lastScore={lastScore}
          battlePhase={battlePhase}
          phase={phase}
          attackEffect={attackEffect}
          gameOver={gameOver}
          onBossAttackEnded={flushBossAttackPresentation}
          onBossDefeatedAnimationEnd={revealWinOverlayAfterBossHit}
        />

        <ScorePanel
          evaluation={evaluation}
          totalScore={totalScore}
          round={round}
          selectedCount={selected.length}
          onPlay={playHand}
          onDiscard={discardSelected}
          discards={discards}
          maxDiscards={maxDiscards}
          canPlay={canPlay}
          canDiscard={canDiscard}
        />

      </div>

      {/* ── 底部手牌 ── */}
      <HandArea
        hand={hand}
        selected={selected}
        onToggle={toggleSelect}
        deckCount={deckCount}
        displayedPlayerHp={displayedPlayerHp}
        playerMaxHp={playerMaxHp}
        shieldActive={shieldActive}
        playerDamageFlash={playerDamageFlash}
        playerHudShakeNonce={playerHudShakeNonce}
      />

      {errorMessage && (
        <div className="absolute left-1/2 top-16 z-[60] -translate-x-1/2 rounded-xl border border-rose-500/30 bg-rose-950/90 px-4 py-2 text-sm text-rose-100 shadow-lg shadow-black/40">
          {errorMessage}
        </div>
      )}

      {/* ── 胜利：延后到 boss-hit 播完（或超时）；失败仍延后 boss-attack ── */}
      {gameOver === 'win' && winRevealUnlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center
                        bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6
                          bg-stone-900 border border-yellow-800/50
                          rounded-2xl px-12 py-10
                          shadow-2xl shadow-black">
            <>
              <div className="text-6xl">🏆</div>
              <div className="text-yellow-300 text-3xl font-black tracking-widest">
                通关！
              </div>
            </>
            <button
              onClick={restartGame}
              className="mt-2 px-8 py-3 rounded-xl font-black text-sm
                         tracking-widest bg-gradient-to-b from-yellow-600
                         to-yellow-800 text-yellow-100
                         hover:from-yellow-500 hover:to-yellow-700
                         active:scale-95 transition-all
                         shadow-lg shadow-yellow-900/50"
            >
              再来一局
            </button>
          </div>
        </div>
      )}
      {gameOver === 'lose' && !bossAttackPresentationHold && (
        <div className="fixed inset-0 z-50 flex items-center justify-center
                        bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6
                          bg-stone-900 border border-yellow-800/50
                          rounded-2xl px-12 py-10
                          shadow-2xl shadow-black">
            <>
              <div className="text-6xl">💀</div>
              <div className="text-red-400 text-3xl font-black tracking-widest">
                游戏结束
              </div>
              <div className="text-stone-400 text-sm text-center leading-relaxed">
                到达第 <span className="text-yellow-400 font-bold">{floor}</span> 层<br />
                累计得分 <span className="text-yellow-400 font-bold">{totalScore.toLocaleString()}</span>
              </div>
            </>
            <button
              onClick={restartGame}
              className="mt-2 px-8 py-3 rounded-xl font-black text-sm
                         tracking-widest bg-gradient-to-b from-yellow-600
                         to-yellow-800 text-yellow-100
                         hover:from-yellow-500 hover:to-yellow-700
                         active:scale-95 transition-all
                         shadow-lg shadow-yellow-900/50"
            >
              再来一局
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
