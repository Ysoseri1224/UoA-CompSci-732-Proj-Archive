import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import usePveSocketStore from '../store/pveSocketStore.js';
import { adaptPveGameState } from '../socket/pveSocketAdapter.js';
import { useAuth } from './useAuth.js';
import useAuthStore, { isTokenAboutToExpire } from '../store/authStore.js';
import { HAND_TYPES } from '../data/handTypes.js';
import { evaluateHand } from '../lib/evaluator.js';
import { audioManager } from '../utils/audioManager.js';

const MAX_SELECT = 5;
const EMPTY_EVALUATION = {
  handType: null,
  baseAttack: 0,
  bonusAttack: 0,
  multiplier: 0,
  totalScore: 0,
};

const COLOR_TO_ELEMENT = {
  red: 'FIRE',
  blue: 'WATER',
  green: 'GRASS',
};

/** Player attack VFX duration (Battlefield AttackEffect ~1.05s). */
const ATTACK_EFFECT_CLEAR_MS = 1050;

/**
 * Infer AttackEffect mode: only pure mono-element hands get fire/water/nature; mixed or unknown → normal.
 * @param {Array<{ color?: string }>|null|undefined} cards
 * @returns {'normal'|'fire'|'water'|'nature'}
 */
function inferAttackEffectModeFromCards(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return 'normal';

  function contribution(card) {
    if (!card) return null;
    if (card.color === 'red') return 'fire';
    if (card.color === 'blue') return 'water';
    if (card.color === 'green') return 'nature';
    return null;
  }

  const modes = cards.map(contribution);
  if (modes.some((m) => m == null)) return 'normal';

  const unique = new Set(modes);
  if (unique.size !== 1) return 'normal';

  return modes[0];
}

// `evaluateHand` and `getHandType` now live in `../lib/evaluator.js` so they
// can be unit-tested without React/store deps and so the contract test in
// `backend/tests/unit/scoring.contract.test.ts` can target a pure module.

function createSocket(accessToken) {
  return io('/', {
    path: '/socket.io',
    autoConnect: false,
    auth: accessToken ? { token: accessToken } : undefined,
  });
}

export function useGameLogic(roomId = null, { startEvent = 'startPveGame' } = {}) {
  const { accessToken } = useAuth();

  const {
    hand,
    deckCount,
    player,
    boss,
    round,
    floor,
    phase,
    skills,
    shuffle,
    play,
    bossRound,
    battleResult,
    shieldActive,
    gameOver,
    connectionStatus,
    lastError,
    applyServerState,
    setConnectionStatus,
    setError,
    setRoomId,
    reset,
  } = usePveSocketStore();

  const socketRef = useRef(null);
  const resolvedScoreKeyRef = useRef(null);
  const pendingEvaluationRef = useRef(null);
  /** Snapshot of cards sent with last `confirmPlay` (for attack VFX element). */
  const pendingPlayedCardsRef = useRef(null);
  const pendingPlayConfirmRef = useRef(false);
  const attackEffectClearTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const battlePhaseTimerRef = useRef(null);
  /** Isolated BOSS_ATTACK → resolveAnimationComplete schedule (must not share beginBattlePhase's clearTimeout). */
  const bossAttackResolveScheduleRef = useRef({ id: 0, timer: /** @type {ReturnType<typeof setTimeout> | null} */ (null) });
  const prevPhaseRef = useRef(phase);
  const prevShieldActiveRef = useRef(shieldActive);
  const prevPlayerHpRef = useRef(player.hp);

  const [selected, setSelected] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [lastScore, setLastScore] = useState(null);
  const [skillWarning, setSkillWarning] = useState(null);
  const [battlePhase, setBattlePhase] = useState(null);
  const [resolvedEvaluation, setResolvedEvaluation] = useState(EMPTY_EVALUATION);
  const [restartNonce, setRestartNonce] = useState(0);
  const [attackEffect, setAttackEffect] = useState(null);

  const scheduleAttackEffectClear = useCallback(() => {
    if (attackEffectClearTimerRef.current != null) {
      clearTimeout(attackEffectClearTimerRef.current);
      attackEffectClearTimerRef.current = null;
    }
    attackEffectClearTimerRef.current = setTimeout(() => {
      attackEffectClearTimerRef.current = null;
      setAttackEffect(null);
    }, ATTACK_EFFECT_CLEAR_MS);
  }, []);

  const selectedCards = useMemo(
    () => selected.map((id) => hand.find((c) => c.id === id)).filter(Boolean),
    [hand, selected],
  );

  const previewEvaluation = useMemo(
    () => (selectedCards.length
      ? evaluateHand(selectedCards, player?.buffs ?? [], Boolean(bossRound?.isDefending))
      : EMPTY_EVALUATION),
    [selectedCards, player?.buffs, bossRound?.isDefending],
  );

  const evaluation = selectedCards.length ? previewEvaluation : resolvedEvaluation;
  const battlePhaseDurationMs = 1500;

  const ensureSocket = useCallback(() => socketRef.current, []);

  const beginBattlePhase = useCallback((nextPhase, onComplete = null) => {
    if (battlePhaseTimerRef.current) {
      clearTimeout(battlePhaseTimerRef.current);
    }
    setBattlePhase(nextPhase);
    battlePhaseTimerRef.current = setTimeout(() => {
      setBattlePhase(null);
      battlePhaseTimerRef.current = null;
      if (onComplete) onComplete();
    }, battlePhaseDurationMs);
  }, [battlePhaseDurationMs]);

  const scheduleResolveAnimationCompleteForBossAttack = useCallback(() => {
    const s = bossAttackResolveScheduleRef.current;
    if (s.timer) {
      clearTimeout(s.timer);
      s.timer = null;
    }
    const dispatchId = ++s.id;
    s.timer = setTimeout(() => {
      s.timer = null;
      if (bossAttackResolveScheduleRef.current.id !== dispatchId) return;
      const socket = socketRef.current;
      if (!socket?.connected) return;
      socket.emit('resolveAnimationComplete');
    }, battlePhaseDurationMs);
  }, [battlePhaseDurationMs]);

  useEffect(() => {
    reset();
    setSelected([]);
    setTotalScore(0);
    setLastScore(null);
    setResolvedEvaluation(EMPTY_EVALUATION);
    resolvedScoreKeyRef.current = null;
    pendingEvaluationRef.current = null;
    pendingPlayedCardsRef.current = null;
    pendingPlayConfirmRef.current = false;
    if (attackEffectClearTimerRef.current != null) {
      clearTimeout(attackEffectClearTimerRef.current);
      attackEffectClearTimerRef.current = null;
    }
    setAttackEffect(null);
    setRoomId(roomId);

    const socket = createSocket(accessToken);
    socketRef.current = socket;

    // ── Token refresh wiring (three layers) ──────────────────────────────
    //
    // ① Reactive sync — whenever any code path (REST 401, manual refresh,
    //    login response) writes a new access token into the auth store, mirror
    //    it onto `socket.auth.token`.  The next handshake (reconnect or
    //    explicit `socket.connect()`) will pick it up automatically.  The
    //    *current* connection is untouched.
    const unsubscribeAuth = useAuthStore.subscribe((state, prev) => {
      if (state.accessToken && state.accessToken !== prev.accessToken && socketRef.current) {
        socketRef.current.auth = { token: state.accessToken };
      }
    });

    // ② Pre-emptive refresh on reconnect — if the user wakes up after a long
    //    sleep, the cached token is likely stale and there has been no REST
    //    traffic to refresh it.  Burn one round-trip via the singleton in
    //    `authStore.refreshAccessToken()` before the handshake, falling back
    //    to whatever token we have if refresh fails (③ will then handle the
    //    server-side rejection).
    socket.on('reconnect_attempt', async () => {
      let token = useAuthStore.getState().accessToken;
      if (!token || isTokenAboutToExpire(token)) {
        try {
          token = await useAuthStore.getState().refreshAccessToken();
        } catch {
          // refresh failed (e.g. refresh token also expired).  Auth state is
          // already cleared by `refreshAccessToken`; PrivateRoute will redirect.
        }
      }
      if (token) socket.auth = { token };
    });

    socket.on('connect', () => {
      setConnectionStatus('connected');
      socket.emit(startEvent);
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      setConnectionStatus('error');
      setError(error.message || 'Socket connection failed.');
    });

    // ③ Server-driven recovery — the backend emits this when the handshake
    //    JWT was syntactically valid but expired.  Refresh, push the new
    //    token onto the socket, and force-recycle the connection so the next
    //    handshake carries the fresh token (re-running the userId-resolution
    //    path on the server so PvE matches will be persisted again).
    socket.on('auth:expired', async () => {
      try {
        const newToken = await useAuthStore.getState().refreshAccessToken();
        socket.auth = { token: newToken };
        socket.disconnect();
        socket.connect();
      } catch {
        // refresh failed — leave the (anonymous) socket connected so the
        // user can still play; PrivateRoute will bounce them after the
        // current screen finishes rendering.
      }
    });

    socket.on('gameError', (payload) => {
      setError(payload?.message ?? 'PvE socket error.');
    });

    socket.on('skillWarning', (payload) => {
      setSkillWarning(payload);
      setTimeout(() => setSkillWarning(null), 2500);
    });

    socket.on('gameState', (payload) => {
      applyServerState(adaptPveGameState(payload));
    });

    setConnectionStatus('connecting');
    socket.connect();

    return () => {
      if (battlePhaseTimerRef.current) {
        clearTimeout(battlePhaseTimerRef.current);
      }
      const s = bossAttackResolveScheduleRef.current;
      if (s.timer) {
        clearTimeout(s.timer);
        s.timer = null;
      }
      s.id += 1;
      pendingPlayConfirmRef.current = false;
      pendingPlayedCardsRef.current = null;
      if (attackEffectClearTimerRef.current != null) {
        clearTimeout(attackEffectClearTimerRef.current);
        attackEffectClearTimerRef.current = null;
      }
      setAttackEffect(null);
      unsubscribeAuth();
      socket.disconnect();
      socketRef.current = null;
      reset();
    };
  }, [accessToken, applyServerState, reset, restartNonce, roomId, setConnectionStatus, setError, setRoomId]);

  useEffect(() => {
    setSelected((prev) => prev.filter((id) => hand.some((card) => card.id === id)));
  }, [hand]);

  useEffect(() => {
    const score = play?.score;
    if (score == null) return;

    const key = `${round}:${score}`;
    if (resolvedScoreKeyRef.current === key) return;

    resolvedScoreKeyRef.current = key;
    setLastScore(score);
    setTotalScore((current) => current + score);
    setResolvedEvaluation(pendingEvaluationRef.current ?? {
      handType: play.handType,
      baseAttack: 0,
      bonusAttack: 0,
      multiplier: 0,
      totalScore: score,
    });
    pendingEvaluationRef.current = null;

    const playedSnapshot = pendingPlayedCardsRef.current;
    pendingPlayedCardsRef.current = null;
    if (score > 0) {
      const mode = inferAttackEffectModeFromCards(playedSnapshot);
      setAttackEffect({ id: Date.now(), mode });
      scheduleAttackEffectClear();
    }
  }, [play, round, scheduleAttackEffectClear]);

  useEffect(() => {
    if (!pendingPlayConfirmRef.current || phase !== 'PLAY' || selected.length === 0 || gameOver) return;

    const socket = ensureSocket();
    if (!socket) return;

    pendingEvaluationRef.current = previewEvaluation;
    pendingPlayedCardsRef.current = selectedCards.slice();
    pendingPlayConfirmRef.current = false;
    socket.emit('confirmPlay');
    setSelected([]);
  }, [ensureSocket, gameOver, phase, previewEvaluation, selected, selectedCards]);

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const prevShieldActive = prevShieldActiveRef.current;
    const prevPlayerHp = prevPlayerHpRef.current;
    const playerTookDamage = player.hp < prevPlayerHp;

    // Player resolve → Boss attack banner: presentation timer may be overwritten by shield_break / boss
    // without clearing the Boss resolve emit (see bossAttackResolveScheduleRef).
    if (prevPhase === 'RESOLVE' && phase === 'BOSS_ATTACK') {
      beginBattlePhase('player');
      scheduleResolveAnimationCompleteForBossAttack();
    } else if (prevShieldActive && !shieldActive && prevPhase === 'BOSS_ATTACK' && phase === 'ROUND_END') {
      beginBattlePhase('shield_break');
    } else if (prevPhase === 'BOSS_ATTACK' && playerTookDamage) {
      beginBattlePhase('boss');
    }

    prevPhaseRef.current = phase;
    prevShieldActiveRef.current = shieldActive;
    prevPlayerHpRef.current = player.hp;
  }, [
    beginBattlePhase,
    phase,
    player.hp,
    scheduleResolveAnimationCompleteForBossAttack,
    shieldActive,
  ]);

  const toggleSelect = useCallback((cardId) => {
    audioManager.playSFX('select');
    const socket = ensureSocket();
    if (!socket || connectionStatus !== 'connected' || gameOver) return;

    let changed = false;
    setSelected((prev) => {
      if (prev.includes(cardId)) {
        changed = true;
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length >= MAX_SELECT) return prev;
      changed = true;
      return [...prev, cardId];
    });

    if (changed && phase === 'PLAY') {
      socket.emit('selectCard', { cardId });
    }
  }, [connectionStatus, ensureSocket, gameOver, phase]);

  const clearSelected = useCallback(() => {
    const socket = ensureSocket();
    if (!socket) return;
    selected.forEach((cardId) => socket.emit('selectCard', { cardId }));
    setSelected([]);
  }, [ensureSocket, selected]);

  const discardSelected = useCallback(() => {
    const socket = ensureSocket();
    if (!socket || selected.length === 0) return;
    audioManager.playSFX('discard');
    socket.emit('shuffleCards', { cardIds: selected });
    setSelected([]);
  }, [ensureSocket, selected]);

  const playHand = useCallback(() => {
    const socket = ensureSocket();
    if (!socket || selected.length === 0 || gameOver) return;
    audioManager.playSFX('play');
    if (phase !== 'PLAY') {
      pendingPlayConfirmRef.current = true;
      socket.emit('enterPlay');
      selected.forEach((cardId) => {
        socket.emit('selectCard', { cardId });
      });
      return;
    }
    pendingEvaluationRef.current = previewEvaluation;
    pendingPlayedCardsRef.current = selectedCards.slice();
    socket.emit('confirmPlay');
    setSelected([]);
  }, [ensureSocket, gameOver, phase, previewEvaluation, selected, selectedCards]);

  const skillChangeColor = useCallback((cardId, newColor) => {
    const socket = ensureSocket();
    if (!socket) return;
    audioManager.playSFX('skill_change');
    socket.emit('useSkill', {
      skill: 'changeColor',
      cardId,
      target: COLOR_TO_ELEMENT[newColor] ?? 'FIRE',
    });
  }, [ensureSocket]);

  const skillChangeCost = useCallback((cardId, newCost) => {
    const socket = ensureSocket();
    if (!socket) return;
    audioManager.playSFX('skill_change');
    socket.emit('useSkill', {
      skill: 'changeCost',
      cardId,
      targetRank: newCost,
    });
  }, [ensureSocket]);

  const skillActivateShield = useCallback(() => {
    const socket = ensureSocket();
    if (!socket) return;
    audioManager.playSFX('skill_shield');
    socket.emit('useSkill', { skill: 'shield' });
  }, [ensureSocket]);

  const restartGame = useCallback(() => {
    const s = bossAttackResolveScheduleRef.current;
    if (s.timer) {
      clearTimeout(s.timer);
      s.timer = null;
    }
    s.id += 1;

    reset();
    setSelected([]);
    setTotalScore(0);
    setLastScore(null);
    setResolvedEvaluation(EMPTY_EVALUATION);
    resolvedScoreKeyRef.current = null;
    pendingEvaluationRef.current = null;
    pendingPlayedCardsRef.current = null;
    pendingPlayConfirmRef.current = false;
    if (attackEffectClearTimerRef.current != null) {
      clearTimeout(attackEffectClearTimerRef.current);
      attackEffectClearTimerRef.current = null;
    }
    setAttackEffect(null);
    setBattlePhase(null);
    setRestartNonce((value) => value + 1);
  }, [reset]);

  const isActionPhase = phase === 'SKILL' || phase === 'SHUFFLE' || phase === 'PLAY';
  const shieldUnavailable = skills.shield.active || skills.shield.onCooldown;

  /** Energy pool: remaining skill charges (cross-round, refilled per floor) */
  const skillCharges = useMemo(() => skills.energy, [skills.energy]);

  return {
    hand,
    deckCount,
    selected,
    selectedCards,
    toggleSelect,
    clearSelected,
    evaluation,
    discardSelected,
    discards: shuffle.remaining,
    maxDiscards: 2,
    canDiscard: connectionStatus === 'connected' && isActionPhase && shuffle.remaining > 0 && selected.length > 0,
    canPlay: connectionStatus === 'connected' && selected.length > 0 && !gameOver,
    playHand,
    round,
    totalScore,
    lastScore,
    playerHp: player.hp,
    playerMaxHp: player.maxHp,
    bossHp: boss?.hp ?? 0,
    bossMaxHp: boss?.maxHp ?? 300,
    bossName: boss?.name,
    floor,
    gameOver,
    restartGame,
    skillCharges,
    maxCharges: player.skillEnergyMax ?? 3,
    skillCooldowns: {
      shield: shieldUnavailable,
    },
    shieldActive,
    skillChangeColor,
    skillChangeCost,
    skillActivateShield,
    battlePhase,
    phase,
    bossRound,
    isActionPhase,
    attackEffect,
    connectionStatus,
    errorMessage: lastError,
    skillWarning,
    boss,
    // Refs exposed for rogue extension hook
    socketRef,
    chosenElement: player.chosenElement ?? null,
  };
}
