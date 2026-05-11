import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import usePveSocketStore from '../store/pveSocketStore.js';
import { adaptPveGameState } from '../socket/pveSocketAdapter.js';
import { useAuth } from './useAuth.js';
import { HAND_TYPES } from '../data/handTypes.js';
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

function getHandType(cards) {
  if (cards.length === 0) return HAND_TYPES.find((h) => h.id === 'high_card');

  const costs = cards.map((c) => c.cost);
  const colors = cards.map((c) => c.color);

  const costCount = {};
  costs.forEach((c) => { costCount[c] = (costCount[c] || 0) + 1; });
  const counts = Object.values(costCount).sort((a, b) => b - a);

  const colorCount = {};
  colors.forEach((c) => { colorCount[c] = (colorCount[c] || 0) + 1; });
  const isFlush = cards.length === 5 && Object.keys(colorCount).length === 1;

  const isStraight = (() => {
    if (cards.length !== 5) return false;
    const sorted = [...new Set(costs)].sort((a, b) => a - b);
    if (sorted.length !== 5) return false;
    if (sorted[4] - sorted[0] === 4) return true;
    const highStraight = [1, 10, 11, 12, 13];
    return highStraight.every((v) => sorted.includes(v));
  })();

  const isRoyalFlush = (() => {
    if (!isFlush || !isStraight) return false;
    const sorted = [...costs].sort((a, b) => a - b);
    const royal = [1, 10, 11, 12, 13];
    return royal.every((v) => sorted.includes(v));
  })();

  if (isRoyalFlush) return HAND_TYPES.find((h) => h.id === 'royal_flush');
  if (isFlush && isStraight) return HAND_TYPES.find((h) => h.id === 'straight_flush');
  if (counts[0] === 4) return HAND_TYPES.find((h) => h.id === 'four_of_a_kind');
  if (counts[0] === 3 && counts[1] === 2) return HAND_TYPES.find((h) => h.id === 'full_house');
  if (isFlush) return HAND_TYPES.find((h) => h.id === 'flush');
  if (isStraight) return HAND_TYPES.find((h) => h.id === 'straight');
  if (counts[0] === 3) return HAND_TYPES.find((h) => h.id === 'three_of_a_kind');
  if (counts[0] === 2 && counts[1] === 2) return HAND_TYPES.find((h) => h.id === 'two_pair');
  if (counts[0] === 2) return HAND_TYPES.find((h) => h.id === 'one_pair');
  return HAND_TYPES.find((h) => h.id === 'high_card');
}

const HAND_SCORES_FRONTEND = {
  royal_flush:      { chips: 100, mult: 8 },
  straight_flush:   { chips: 100, mult: 8 },
  four_of_a_kind:   { chips: 60,  mult: 7 },
  full_house:       { chips: 40,  mult: 6 },
  flush:            { chips: 35,  mult: 4 },
  straight:         { chips: 30,  mult: 4 },
  three_of_a_kind:  { chips: 30,  mult: 3 },
  two_pair:         { chips: 20,  mult: 2 },
  one_pair:         { chips: 10,  mult: 2 },
  high_card:        { chips: 5,   mult: 1 },
};

const COMMON_HANDS = ['one_pair', 'two_pair', 'three_of_a_kind', 'high_card'];
const RARE_HANDS   = ['straight', 'flush'];

function getHandTier(handTypeId) {
  if (COMMON_HANDS.includes(handTypeId)) return 'common';
  if (RARE_HANDS.includes(handTypeId))   return 'rare';
  return 'epic';
}

export function evaluateHand(cards, buffs = []) {
  const handType = getHandType(cards);
  const { chips: baseChipsInit, mult: multInit } =
    HAND_SCORES_FRONTEND[handType.id] ?? { chips: 5, mult: 1 };

  let baseChips = baseChipsInit;
  let mult      = multInit;

  // HAND_CHIPS_BONUS / HAND_MULT_BONUS (per hand type)
  const backendHandType = handType.id
    .replace('one_pair', 'PAIR')
    .replace('two_pair', 'TWO_PAIR')
    .replace('three_of_a_kind', 'THREE_OF_A_KIND')
    .replace('straight_flush', 'STRAIGHT_FLUSH')
    .replace('four_of_a_kind', 'FOUR_OF_A_KIND')
    .replace('full_house', 'FULL_HOUSE')
    .replace('flush', 'FLUSH')
    .replace('straight', 'STRAIGHT')
    .replace('high_card', 'HIGH_CARD')
    .replace('royal_flush', 'STRAIGHT_FLUSH')
    .toUpperCase();

  for (const buff of buffs) {
    if (buff.type === 'HAND_CHIPS_BONUS' && buff.handType === backendHandType)
      baseChips += buff.bonusChips;
    if (buff.type === 'HAND_MULT_BONUS' && buff.handType === backendHandType)
      mult += buff.bonusMult;
  }

  // TIERED_CHIPS_BONUS / TIERED_MULT_BONUS
  const tier = getHandTier(handType.id);
  for (const buff of buffs) {
    if (buff.type === 'TIERED_CHIPS_BONUS')
      baseChips += tier === 'common' ? buff.commonBonus : tier === 'rare' ? buff.rareBonus : buff.epicBonus;
    if (buff.type === 'TIERED_MULT_BONUS')
      mult += tier === 'common' ? buff.commonMult : tier === 'rare' ? buff.rareMult : buff.epicMult;
  }

  // Per-card chip calculation
  const COLOR_TO_ELEMENT_MAP = { red: 'FIRE', blue: 'WATER', green: 'GRASS' };
  let cardChips = 0;
  for (const card of cards) {
    let chip = card.cost;
    const cardElement = COLOR_TO_ELEMENT_MAP[card.color];
    for (const buff of buffs) {
      if (buff.type === 'ELEMENT_CHIP_MULT' && buff.element === cardElement)
        chip *= buff.mult;
    }
    for (const buff of buffs) {
      if (buff.type === 'ELEMENT_CHIPS_BONUS' && buff.element === cardElement)
        chip += buff.bonusChips;
    }
    for (const buff of buffs) {
      if (buff.type === 'ALL_CHIPS_BONUS')
        chip += buff.bonusChips;
    }
    cardChips += chip;
  }

  const totalScore = Math.floor((baseChips + cardChips) * mult);
  return {
    handType,
    baseAttack: baseChips,
    bonusAttack: cardChips,
    multiplier: mult,
    totalScore,
  };
}

function createSocket(accessToken) {
  return io('/', {
    path: '/socket.io',
    autoConnect: false,
    auth: accessToken ? { token: accessToken } : undefined,
  });
}

export function useGameLogic(roomId = null) {
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
    () => (selectedCards.length ? evaluateHand(selectedCards, player.buffs ?? []) : EMPTY_EVALUATION),
    [selectedCards, player.buffs],
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

    socket.on('connect', () => {
      setConnectionStatus('connected');
      socket.emit('startPveGame');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      setConnectionStatus('error');
      setError(error.message || 'Socket connection failed.');
    });

    socket.on('gameError', (payload) => {
      setError(payload?.message ?? 'PvE socket error.');
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
    attackEffect,
    connectionStatus,
    errorMessage: lastError,
    // Refs exposed for rogue extension hook
    socketRef,
    chosenElement: player.chosenElement ?? null,
  };
}
