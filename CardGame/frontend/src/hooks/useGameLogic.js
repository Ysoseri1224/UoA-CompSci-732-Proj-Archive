import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import usePveSocketStore from '../store/pveSocketStore.js';
import { adaptPveGameState } from '../socket/pveSocketAdapter.js';
import { useAuth } from './useAuth.js';
import { HAND_TYPES } from '../data/handTypes.js';

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

export function evaluateHand(cards) {
  const handType = getHandType(cards);
  const baseAttack = cards.reduce((sum, c) => sum + c.cost, 0);
  const bonusAttack = handType.baseBonus;
  const multiplier = handType.multiplier;
  const totalScore = Math.round((baseAttack + bonusAttack) * multiplier);
  return { handType, baseAttack, bonusAttack, multiplier, totalScore };
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
  const battlePhaseTimerRef = useRef(null);
  const prevPhaseRef = useRef(phase);
  const prevShieldActiveRef = useRef(shieldActive);
  const prevPlayerHpRef = useRef(player.hp);

  const [selected, setSelected] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [lastScore, setLastScore] = useState(null);
  const [battlePhase, setBattlePhase] = useState(null);
  const [resolvedEvaluation, setResolvedEvaluation] = useState(EMPTY_EVALUATION);
  const [restartNonce, setRestartNonce] = useState(0);

  const selectedCards = useMemo(
    () => selected.map((id) => hand.find((c) => c.id === id)).filter(Boolean),
    [hand, selected],
  );

  const previewEvaluation = useMemo(
    () => (selectedCards.length ? evaluateHand(selectedCards) : EMPTY_EVALUATION),
    [selectedCards],
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

  useEffect(() => {
    reset();
    setSelected([]);
    setTotalScore(0);
    setLastScore(null);
    setResolvedEvaluation(EMPTY_EVALUATION);
    resolvedScoreKeyRef.current = null;
    pendingEvaluationRef.current = null;
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
  }, [play, round]);

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const prevShieldActive = prevShieldActiveRef.current;
    const prevPlayerHp = prevPlayerHpRef.current;
    const playerTookDamage = player.hp < prevPlayerHp;

    // for Player attack animation played DON'T CHANGE
    if (prevPhase === 'RESOLVE' && phase === 'BOSS_ATTACK') {
      beginBattlePhase('player', () => {
        const socket = ensureSocket();
        if (!socket) return;
        socket.emit('resolveAnimationComplete');
      });
    } else if (prevShieldActive && !shieldActive && prevPhase === 'BOSS_ATTACK' && phase === 'ROUND_END') {
      beginBattlePhase('shield_break');
    } else if (prevPhase === 'BOSS_ATTACK' && playerTookDamage) {
      beginBattlePhase('boss');
    }

    prevPhaseRef.current = phase;
    prevShieldActiveRef.current = shieldActive;
    prevPlayerHpRef.current = player.hp;
  }, [beginBattlePhase, ensureSocket, phase, player.hp, shieldActive]);

  const toggleSelect = useCallback((cardId) => {
    const socket = ensureSocket();
    if (!socket || connectionStatus !== 'connected' || gameOver) return;

    if (phase !== 'PLAY') {
      socket.emit('enterPlay');
    }

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

    if (changed) {
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
    socket.emit('shuffleCards', { cardIds: selected });
    setSelected([]);
  }, [ensureSocket, selected]);

  const playHand = useCallback(() => {
    const socket = ensureSocket();
    if (!socket || selected.length === 0 || gameOver) return;
    pendingEvaluationRef.current = previewEvaluation;
    socket.emit('confirmPlay');
    setSelected([]);
  }, [ensureSocket, gameOver, previewEvaluation, selected.length]);

  const skillChangeColor = useCallback((cardId, newColor) => {
    const socket = ensureSocket();
    if (!socket) return;
    socket.emit('useSkill', {
      skill: 'changeColor',
      cardId,
      target: COLOR_TO_ELEMENT[newColor] ?? 'FIRE',
    });
  }, [ensureSocket]);

  const skillChangeCost = useCallback((cardId, newCost) => {
    const socket = ensureSocket();
    if (!socket) return;
    socket.emit('useSkill', {
      skill: 'changeCost',
      cardId,
      targetRank: newCost,
    });
  }, [ensureSocket]);

  const skillActivateShield = useCallback(() => {
    const socket = ensureSocket();
    if (!socket) return;
    socket.emit('useSkill', { skill: 'shield' });
  }, [ensureSocket]);

  const restartGame = useCallback(() => {
    reset();
    setSelected([]);
    setTotalScore(0);
    setLastScore(null);
    setResolvedEvaluation(EMPTY_EVALUATION);
    resolvedScoreKeyRef.current = null;
    pendingEvaluationRef.current = null;
    setBattlePhase(null);
    setRestartNonce((value) => value + 1);
  }, [reset]);

  const isActionPhase = phase === 'SKILL' || phase === 'SHUFFLE' || phase === 'PLAY';
  const shieldUnavailable = skills.shield.active || skills.shield.onCooldown;

  /** Matches SkillBar pip count: one slot per skill still available this round */
  const skillCharges = useMemo(() => {
    let n = 0;
    if (!skills.changeColor.used) n += 1;
    if (!skills.changeCost.used) n += 1;
    if (!skills.shield.active && !skills.shield.onCooldown) n += 1;
    return n;
  }, [
    skills.changeColor.used,
    skills.changeCost.used,
    skills.shield.active,
    skills.shield.onCooldown,
  ]);

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
    skillCooldowns: {
      changeColor: skills.changeColor.used,
      changeCost: skills.changeCost.used,
      shield: shieldUnavailable,
    },
    shieldActive,
    skillChangeColor,
    skillChangeCost,
    skillActivateShield,
    battlePhase,
    connectionStatus,
    errorMessage: lastError,
  };
}
