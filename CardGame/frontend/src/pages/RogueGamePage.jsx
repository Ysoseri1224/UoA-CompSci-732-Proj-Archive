import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCallback, useLayoutEffect } from 'react';

import Battlefield from '../components/game/Battlefield';
import HandArea from '../components/game/HandArea';
import ScorePanel from '../components/game/ScorePanel';
import SkillBar from '../components/game/SkillBar';
import Enhancement from '../components/game/Enhancement.jsx';

import { useRogueLogic } from '../hooks/useRogueLikeLogic.js';
import { startRogueRun, notifyRogueWon } from '../api/rogueapi.js';

const BOSS_ATTACK_UX_FALLBACK_MS = 12_500;

function detectBossAttackEntrance(prevPhase, phase, prevBattlePhase, battlePhase) {
  const phaseUnset = !(typeof phase === 'string') || phase.trim() === '';
  const enteredBossAttackPhase = phase === 'BOSS_ATTACK' && prevPhase !== 'BOSS_ATTACK';
  const enteredBossBattleBanner =
    phaseUnset && battlePhase === 'boss' && prevBattlePhase !== 'boss';
  return enteredBossAttackPhase || enteredBossBattleBanner;
}

export default function RogueGamePage() {
  const navigate       = useNavigate();
  const wonNotifiedRef = useRef(false);
  const winLayerRef    = useRef(0);

  // Start a new run on mount
  useEffect(() => {
    startRogueRun().catch(console.error);
  }, []);

  const {
    hand, deckCount, selected, toggleSelect,
    evaluation, discardSelected, discards, maxDiscards, canDiscard, canPlay,
    playHand, round, totalScore, lastScore,
    playerHp, playerMaxHp, bossHp, bossMaxHp, floor,
    gameOver, restartGame, battlePhase, phase,
    skillCharges, maxCharges, skillCooldowns, shieldActive,
    skillChangeColor, skillChangeCost, skillActivateShield,
    connectionStatus, errorMessage,
    // Rogue-specific
    enhancements, pendingEnhancements, confirmEnhancement, showEnhancementAfterAnimation,
    canRetryFloor, retryFloor, showLose, runComplete,
  } = useRogueLogic((layer) => { winLayerRef.current = layer; });

  // Boss attack presentation (mirrors GamePage exactly)
  const truthHpRef = useRef(playerHp);
  truthHpRef.current = playerHp;

  const [displayedPlayerHp,          setDisplayedPlayerHp]          = useState(() => playerHp);
  const [bossAttackPresentationHold,  setBossAttackPresentationHold] = useState(false);
  const [winRevealUnlocked,           setWinRevealUnlocked]          = useState(true);
  const [playerDamageFlash,           setPlayerDamageFlash]          = useState(null);
  const [playerHudShakeNonce,         setPlayerHudShakeNonce]        = useState(0);

  const holdHpSyncDuringBossAttackRef       = useRef(false);
  const displayedHpSnapAtBossAttackRef      = useRef(displayedPlayerHp);
  const displayedPlayerHpLiveRef            = useRef(displayedPlayerHp);
  displayedPlayerHpLiveRef.current          = displayedPlayerHp;
  const prevPhaseRef                        = useRef(phase);
  const prevBattlePhaseRef                  = useRef(battlePhase);
  const fallbackBossAttackUxTimerRef        = useRef(null);
  const bossAttackUxFlushedRef              = useRef(true);
  const prevEndedMatchRef                   = useRef(gameOver);

  useEffect(() => {
    if (gameOver !== 'win') { setWinRevealUnlocked(true); return; }
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
    const snap  = displayedHpSnapAtBossAttackRef.current;
    const truth = truthHpRef.current;
    const dmg   = Math.max(0, Math.round(snap - truth));
    setDisplayedPlayerHp(truth);
    setBossAttackPresentationHold(false);
    if (dmg > 0) {
      setPlayerHudShakeNonce(n => n + 1);
      setPlayerDamageFlash({ id: Date.now(), amount: dmg });
    }
  }, [clearBossFallbackTimer]);

  useEffect(() => {
    if (!playerDamageFlash) return;
    const t = window.setTimeout(() => setPlayerDamageFlash(null), 1300);
    return () => window.clearTimeout(t);
  }, [playerDamageFlash]);

  useEffect(() => {
    if (holdHpSyncDuringBossAttackRef.current) return;
    setDisplayedPlayerHp(playerHp);
  }, [playerHp]);

  useLayoutEffect(() => {
    const prevPh = prevPhaseRef.current;
    const prevBp = prevBattlePhaseRef.current;
    const entered = detectBossAttackEntrance(prevPh, phase, prevBp, battlePhase);
    prevPhaseRef.current    = phase;
    prevBattlePhaseRef.current = battlePhase;
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

  useEffect(() => {
    prevPhaseRef.current       = phase;
    prevBattlePhaseRef.current = battlePhase;
    clearBossFallbackTimer();
    holdHpSyncDuringBossAttackRef.current = false;
    bossAttackUxFlushedRef.current = true;
    setBossAttackPresentationHold(false);
    setWinRevealUnlocked(true);
    setDisplayedPlayerHp(truthHpRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Trigger boss attack animation when player dies
  const prevGameOverRef = useRef(gameOver);
  useEffect(() => {
    const prev = prevGameOverRef.current;
    prevGameOverRef.current = gameOver;
    if (prev !== 'lose' && gameOver === 'lose') {
      // Player just died — show boss attack animation before lose screen
      bossAttackUxFlushedRef.current = false;
      holdHpSyncDuringBossAttackRef.current = true;
      displayedHpSnapAtBossAttackRef.current = displayedPlayerHpLiveRef.current;
      setBossAttackPresentationHold(true);
      clearBossFallbackTimer();
      fallbackBossAttackUxTimerRef.current = window.setTimeout(() => {
        fallbackBossAttackUxTimerRef.current = null;
        flushBossAttackPresentation();
      }, BOSS_ATTACK_UX_FALLBACK_MS);
    }
  }, [gameOver, clearBossFallbackTimer, flushBossAttackPresentation]);

  // Notify REST API on full run complete
  useEffect(() => {
    if (runComplete && !wonNotifiedRef.current) {
      wonNotifiedRef.current = true;
      notifyRogueWon().catch(console.error);
    }
  }, [runComplete]);

  async function handlePlayAgain() {
    wonNotifiedRef.current = false;
    startRogueRun().catch(console.error);
    restartGame();
  }

  async function handleRetryFloor() {
    const restored = await retryFloor();
    if (!restored) handlePlayAgain();
  }

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 30%, #1a1608, #080604)', top: 0, zIndex: 50 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 flex-shrink-0 border-b border-yellow-900/40 bg-gradient-to-b from-stone-950 to-transparent"
           style={{ height: 48 }}>
        <div className="font-mono text-yellow-600 text-xs tracking-widest">ROGUE MODE</div>
        <div className="flex items-center gap-4">
          <span className="text-stone-500 text-[11px] font-mono tracking-widest">
            {connectionStatus.toUpperCase()}
          </span>
          <span className="text-yellow-900 text-xs font-mono tracking-widest">ROUND {round}</span>
          <span className="text-yellow-900 text-xs font-mono tracking-widest">FLOOR {floor}</span>
          <span className="text-yellow-700 text-xs font-mono tracking-widest">
            SCORE {totalScore.toLocaleString()}
          </span>
        </div>
        {/* Active enhancements */}
        <div className="flex gap-2">
          {enhancements.map((e, i) => (
            <div key={`${e.id}-${i}`}
                 className="px-2 py-1 rounded text-[10px] text-stone-400 border border-stone-700 bg-stone-900/60">
              {e.label ?? e.id}
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
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
          floor={floor}
          lastScore={lastScore}
          battlePhase={battlePhase}
          phase={phase}
          gameOver={gameOver}
          onBossAttackEnded={flushBossAttackPresentation}
          onBossDefeatedAnimationEnd={() => {
            revealWinOverlayAfterBossHit();
            showEnhancementAfterAnimation();
          }}
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

      {/* Hand area */}
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

      {/* Enhancement modal */}
      {pendingEnhancements && (
        <Enhancement
          options={pendingEnhancements}
          floor={floor}
          onConfirm={confirmEnhancement}
        />
      )}

      {/* Win overlay */}
      {runComplete && winRevealUnlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 bg-stone-900 border border-yellow-800/50 rounded-2xl px-12 py-10 shadow-2xl shadow-black">
            <div className="text-6xl">🏆</div>
            <div className="text-yellow-300 text-3xl font-black tracking-widest">全通关！</div>
            <div className="text-stone-400 text-sm">通关所有 10 层！</div>
            <button onClick={handlePlayAgain}
                    className="mt-2 px-8 py-3 rounded-xl font-black text-sm tracking-widest bg-gradient-to-b from-yellow-600 to-yellow-800 text-yellow-100 hover:from-yellow-500 hover:to-yellow-700 active:scale-95 transition-all shadow-lg shadow-yellow-900/50">
              再来一局
            </button>
            <button onClick={() => navigate('/')}
                    className="text-stone-500 text-sm hover:text-stone-300 transition-colors">
              返回主页
            </button>
          </div>
        </div>
      )}

      {/* Lose overlay */}
      {showLose && !bossAttackPresentationHold && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 bg-stone-900 border border-yellow-800/50 rounded-2xl px-12 py-10 shadow-2xl shadow-black">
            <div className="text-6xl">💀</div>
            <div className="text-red-400 text-3xl font-black tracking-widest">游戏结束</div>
            <div className="text-stone-400 text-sm text-center leading-relaxed">
              到达第 <span className="text-yellow-400 font-bold">{floor}</span> 层<br />
              累计得分 <span className="text-yellow-400 font-bold">{totalScore.toLocaleString()}</span>
            </div>
            <button
              onClick={canRetryFloor ? handleRetryFloor : handlePlayAgain}
              className="mt-2 px-8 py-3 rounded-xl font-black text-sm tracking-widest bg-gradient-to-b from-red-700 to-red-900 text-white hover:from-red-600 hover:to-red-800 active:scale-95 transition-all shadow-lg">
              {canRetryFloor ? '重试本层' : '再来一局'}
            </button>
            <button onClick={() => navigate('/')}
                    className="text-stone-500 text-sm hover:text-stone-300 transition-colors">
              返回主页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}