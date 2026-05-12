import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Battlefield from '../components/game/Battlefield';
import HandArea from '../components/game/HandArea';
import ScorePanel from '../components/game/ScorePanel';
import SkillBar from '../components/game/SkillBar';
import Enhancement from '../components/game/Enhancement.jsx';

import { useRogueLogic } from '../hooks/useRogueLikeLogic.js';
import { startRogueRun, notifyRogueWon, getCurrentRogueRun, saveRogueProgress, notifyFloorLost } from '../api/rogueapi.js';
import { audioManager } from '../utils/audioManager.js';

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
  const [buffDetailOpen, setBuffDetailOpen] = useState(false);

  function continueFromSave() {
    setSaveChoiceVisible(false);
    if (existingSave && socketRef?.current) {
      const buffs = (existingSave.enhancements || []).map(e => e?.buff).filter(Boolean);
      setEnhancements(existingSave.enhancements || []);
      socketRef.current.emit('restoreFromCheckpoint', {
        layer: existingSave.layer ?? 1,
        playerHp: existingSave.playerHp ?? 20,
        bossHp: existingSave.bossHp ?? 543,
        buffs,
      });
    }
  }

  function startNewGame() {
    setSaveChoiceVisible(false);
    setExistingSave(null);
    startRogueRun().then(() => {
      restartGame();
    }).catch(err => console.error(err));
  }

  const [saveChoiceVisible, setSaveChoiceVisible] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [existingSave, setExistingSave] = useState(null);

  // Check for existing save on mount — never auto-start new run
  useEffect(() => {
    let cancelled = false;
    getCurrentRogueRun().then(save => {
      if (!cancelled && save?.snapshot?.status === 'active') {
        setExistingSave(save.snapshot);
        setSaveChoiceVisible(true);
      }
    }).catch(() => {});
    audioManager.playBGM();
    return () => { cancelled = true; };
  }, []);

  const {
    hand, deckCount, selected, toggleSelect,
    evaluation, discardSelected, discards, maxDiscards, canDiscard, canPlay,
    playHand, round, totalScore, lastScore,
    playerHp, playerMaxHp, bossHp, bossMaxHp, floor,
    gameOver, restartGame, battlePhase, phase,
    skillCharges, maxCharges, skillCooldowns, shieldActive,
    skillChangeColor, skillChangeCost, skillActivateShield,
    isActionPhase, connectionStatus, errorMessage, socketRef, skillWarning, attackEffect, bossRound, boss,
    // Rogue-specific
    enhancements, setEnhancements, pendingEnhancements, confirmEnhancement, showEnhancementAfterAnimation,
    canRetryFloor, retryFloor, showLose, runComplete,
  } = useRogueLogic((layer) => { winLayerRef.current = layer; });


  // Save on tab close / navigation away
  useEffect(() => {
    const save = () => saveRogueProgress({ layer: floor, playerHp, bossHp, enhancements, stats: { totalRounds: round } }).catch(() => {});
    window.addEventListener('beforeunload', save);
    return () => window.removeEventListener('beforeunload', save);
  }, [floor, playerHp, bossHp, round, enhancements]);

  // Boss attack presentation (mirrors GamePage exactly)
  const truthHpRef = useRef(playerHp);
  truthHpRef.current = playerHp;

  const [displayedPlayerHp,          setDisplayedPlayerHp]          = useState(() => playerHp);
  const [bossAttackPresentationHold,  setBossAttackPresentationHold] = useState(false);
  const [winRevealUnlocked,           setWinRevealUnlocked]          = useState(false);
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
          <button
            type="button"
            onClick={() => setExitConfirmVisible(true)}
            className="ml-2 rounded border border-amber-900/55 bg-stone-950/60 px-2 py-1 text-[10px] font-medium text-amber-100/95 hover:border-amber-700/70 hover:bg-amber-950/35 sm:px-3 sm:text-xs"
            aria-label="Exit to lobby"
          >
            Exit
          </button>
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
          disabled={!isActionPhase}
        />
        <Battlefield
          bossHp={bossHp}
          bossMaxHp={bossMaxHp}
          floor={floor}
          lastScore={lastScore}
          battlePhase={battlePhase}
          phase={phase}
          bossRound={bossRound}
          attackEffect={attackEffect}
          bossIntent={bossRound?.intent ?? 'ATTACK'}
          bossAttack={bossRound?.willReleaseCharge ? boss?.chargeAttack : boss?.attackPerRound}
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
        buffs={enhancements}
        onBuffClick={() => setBuffDetailOpen(v => !v)}
        buffDetailOpen={buffDetailOpen}
      />

      {skillWarning && (
        <div className="absolute left-1/2 top-16 z-[60] -translate-x-1/2 rounded-xl border border-amber-500/30 bg-amber-950/90 px-4 py-2 text-sm text-amber-100 shadow-lg shadow-black/40">
          {skillWarning.message}
        </div>
      )}
      {errorMessage && (
        <div className="absolute left-1/2 top-16 z-[60] -translate-x-1/2 rounded-xl border border-rose-500/30 bg-rose-950/90 px-4 py-2 text-sm text-rose-100 shadow-lg shadow-black/40">
          {errorMessage}
        </div>
      )}

      {/* Exit confirmation modal */}
      {exitConfirmVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 bg-stone-900 border border-amber-800/50 rounded-2xl px-10 py-8 shadow-2xl shadow-black">
            <div className="text-stone-300 text-lg font-bold tracking-widest">Exit Rogue Mode?</div>
            <div className="text-stone-400 text-sm">Your progress will be saved.</div>
            <div className="flex gap-3 mt-1">
              <button onClick={async () => { await saveRogueProgress({ layer: floor, playerHp, bossHp, enhancements, stats: { totalRounds: round } }).catch(() => {}); navigate('/lobby'); }}
                      className="px-6 py-2.5 rounded-xl font-black text-sm tracking-widest bg-gradient-to-b from-amber-600 to-amber-800 text-amber-100 hover:from-amber-500 hover:to-amber-700 active:scale-95 transition-all shadow-lg">
                Save & Exit
              </button>
              <button onClick={async () => { await startRogueRun().catch(() => {}); navigate('/lobby'); }}
                      className="px-6 py-2.5 rounded-xl font-black text-sm tracking-widest bg-gradient-to-b from-stone-700 to-stone-900 text-stone-300 hover:from-stone-600 hover:to-stone-800 active:scale-95 transition-all shadow-lg">
                Exit without Saving
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save choice modal */}
      {saveChoiceVisible && existingSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 bg-stone-900 border border-yellow-800/50 rounded-2xl px-10 py-8 shadow-2xl shadow-black">
            <div className="text-5xl">📂</div>
            <div className="text-yellow-300 text-xl font-black tracking-widest">Active Run Found</div>
            <div className="text-stone-400 text-sm text-center">
              Floor {existingSave.layer ?? 1} · HP {existingSave.playerHp}/{existingSave.playerMaxHp} · {existingSave.enhancements?.length ?? 0} buffs
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={continueFromSave}
                      className="px-6 py-2.5 rounded-xl font-black text-sm tracking-widest bg-gradient-to-b from-yellow-600 to-yellow-800 text-yellow-100 hover:from-yellow-500 hover:to-yellow-700 active:scale-95 transition-all shadow-lg shadow-yellow-900/50">
                Continue Floor {existingSave.layer ?? 1}
              </button>
              <button onClick={startNewGame}
                      className="px-6 py-2.5 rounded-xl font-black text-sm tracking-widest bg-gradient-to-b from-red-700 to-red-900 text-white hover:from-red-600 hover:to-red-800 active:scale-95 transition-all shadow-lg">
                New Game
              </button>
            </div>
          </div>
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
            <div className="text-yellow-300 text-3xl font-black tracking-widest">RUN COMPLETE!</div>
            <div className="text-stone-400 text-sm">All 10 floors cleared!</div>
            <button onClick={handlePlayAgain}
                    className="mt-2 px-8 py-3 rounded-xl font-black text-sm tracking-widest bg-gradient-to-b from-yellow-600 to-yellow-800 text-yellow-100 hover:from-yellow-500 hover:to-yellow-700 active:scale-95 transition-all shadow-lg shadow-yellow-900/50">
              Play Again
            </button>
            <button onClick={() => { saveRogueProgress({ layer: floor, playerHp, bossHp, enhancements, stats: { totalRounds: round } }).catch(() => {}); navigate('/lobby'); }}
                    className="text-stone-500 text-sm hover:text-stone-300 transition-colors">
              Exit to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Lose overlay */}
      {showLose && !bossAttackPresentationHold && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 bg-stone-900 border border-yellow-800/50 rounded-2xl px-12 py-10 shadow-2xl shadow-black">
            <div className="text-6xl">💀</div>
            <div className="text-red-400 text-3xl font-black tracking-widest">GAME OVER</div>
            <div className="text-stone-400 text-sm text-center leading-relaxed">
              Reached Floor <span className="text-yellow-400 font-bold">{floor}</span><br />
              Total Score <span className="text-yellow-400 font-bold">{totalScore.toLocaleString()}</span>
            </div>
            <button
              onClick={canRetryFloor ? handleRetryFloor : handlePlayAgain}
              className="mt-2 px-8 py-3 rounded-xl font-black text-sm tracking-widest bg-gradient-to-b from-red-700 to-red-900 text-white hover:from-red-600 hover:to-red-800 active:scale-95 transition-all shadow-lg">
              {canRetryFloor ? 'Retry Floor' : 'Play Again'}
            </button>
            <button onClick={async () => { await notifyFloorLost().catch(() => {}); navigate('/lobby'); }}
                    className="text-stone-500 text-sm hover:text-stone-300 transition-colors">
              Exit to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}