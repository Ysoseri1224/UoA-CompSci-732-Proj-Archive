import { useState, useCallback, useMemo } from 'react';
import { CARD_POOL } from '../data/cards';
import { HAND_TYPES } from '../data/handTypes';

const HAND_SIZE = 7;
const MAX_SELECT = 5;
const MAX_DISCARDS = 2;

// ── 工具函数 ──────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── 牌型判断 ──────────────────────────────────────────────

function getHandType(cards) {
  if (cards.length === 0) return HAND_TYPES.find(h => h.id === 'high_card');

  const costs  = cards.map(c => c.cost);
  const colors = cards.map(c => c.color);

  const costCount = {};
  costs.forEach(c => { costCount[c] = (costCount[c] || 0) + 1; });
  const counts = Object.values(costCount).sort((a, b) => b - a);

  const colorCount = {};
  colors.forEach(c => { colorCount[c] = (colorCount[c] || 0) + 1; });
  const isFlush = cards.length === 5 && Object.keys(colorCount).length === 1;

  const isStraight = (() => {
    if (cards.length !== 5) return false;
    const sorted = [...new Set(costs)].sort((a, b) => a - b);
    if (sorted.length !== 5) return false;
    if (sorted[4] - sorted[0] === 4) return true;
    const highStraight = [1, 10, 11, 12, 13];
    return highStraight.every(v => sorted.includes(v));
  })();

  const isRoyalFlush = (() => {
    if (!isFlush || !isStraight) return false;
    const sorted = [...costs].sort((a, b) => a - b);
    const royal = [1, 10, 11, 12, 13];
    return royal.every(v => sorted.includes(v));
  })();

  if (isRoyalFlush)                        return HAND_TYPES.find(h => h.id === 'royal_flush');
  if (isFlush && isStraight)               return HAND_TYPES.find(h => h.id === 'straight_flush');
  if (counts[0] === 4)                     return HAND_TYPES.find(h => h.id === 'four_of_a_kind');
  if (counts[0] === 3 && counts[1] === 2)  return HAND_TYPES.find(h => h.id === 'full_house');
  if (isFlush)                             return HAND_TYPES.find(h => h.id === 'flush');
  if (isStraight)                          return HAND_TYPES.find(h => h.id === 'straight');
  if (counts[0] === 3)                     return HAND_TYPES.find(h => h.id === 'three_of_a_kind');
  if (counts[0] === 2 && counts[1] === 2)  return HAND_TYPES.find(h => h.id === 'two_pair');
  if (counts[0] === 2)                     return HAND_TYPES.find(h => h.id === 'one_pair');
  return HAND_TYPES.find(h => h.id === 'high_card');
}

// ── 评估出牌分数 ──────────────────────────────────────────

export function evaluateHand(cards) {
  const handType    = getHandType(cards);
  const baseAttack  = cards.reduce((sum, c) => sum + c.cost, 0);
  const bonusAttack = handType.baseBonus;
  const multiplier  = handType.multiplier;
  const totalScore  = Math.round((baseAttack + bonusAttack) * multiplier);
  return { handType, baseAttack, bonusAttack, multiplier, totalScore };
}

// ── 初始化 ────────────────────────────────────────────────

function buildInitialState() {
  const shuffled = shuffle(CARD_POOL);
  return {
    hand: shuffled.slice(0, HAND_SIZE),
    deck: shuffled.slice(HAND_SIZE),
  };
}

// ── 主 Hook ───────────────────────────────────────────────

export function useGameLogic() {
  const [{ hand, deck }, setState] = useState(buildInitialState);
  const [selected,    setSelected]   = useState([]);
  const [discards,    setDiscards]   = useState(MAX_DISCARDS);
  const [round,       setRound]      = useState(1);
  const [totalScore,  setTotalScore] = useState(0);
  const [lastScore,   setLastScore]  = useState(null);

  // 技能状态
  const [skillCooldowns, setSkillCooldowns] = useState({
    changeColor: false,
    changeCost:  false,
    shield:      false,
  });

  // 战斗状态
  const [playerHp,  setPlayerHp]  = useState(20);
  const [bossHp,    setBossHp]    = useState(300);
  const [bossMaxHp, setBossMaxHp] = useState(300);
  const [floor,     setFloor]     = useState(1);
  const [gameOver,  setGameOver]  = useState(null); // null | 'win' | 'lose'

  // 选中的卡牌对象
  const selectedCards = useMemo(
    () => selected.map(id => hand.find(c => c.id === id)).filter(Boolean),
    [hand, selected]
  );

  // 实时牌型评估
  const evaluation = useMemo(() => evaluateHand(selectedCards), [selectedCards]);

  // ── 选/取消选中 ──────────────────────────────────────
  const toggleSelect = useCallback((cardId) => {
    setSelected(prev => {
      if (prev.includes(cardId)) return prev.filter(id => id !== cardId);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, cardId];
    });
  }, []);

  // ── 弃牌补充 ─────────────────────────────────────────
  const discardSelected = useCallback(() => {
    if (discards <= 0 || selected.length === 0) return;

    setState(prev => {
      const kept      = prev.hand.filter(c => !selected.includes(c.id));
      const discarded = prev.hand.filter(c =>  selected.includes(c.id));
      const count     = discarded.length;
      const newDeck   = shuffle([...prev.deck, ...discarded]);
      const drawn     = newDeck.slice(0, count);
      const rest      = newDeck.slice(count);
      return { hand: [...kept, ...drawn], deck: rest };
    });

    setSelected([]);
    setDiscards(d => d - 1);
  }, [discards, selected]);

  // ── 出牌结算 ─────────────────────────────────────────
  const playHand = useCallback(() => {
    if (selected.length === 0 || gameOver) return;

    const score      = evaluation.totalScore;
    const newBossHp  = bossHp - score;

    setLastScore(score);
    setTotalScore(prev => prev + score);

    if (newBossHp <= 0) {
      // Boss 击杀 → 进入下一层
      const nextFloor      = floor + 1;
      const nextBossMaxHp  = Math.round(300 * Math.pow(1.5, nextFloor - 1));
      setBossHp(nextBossMaxHp);
      setBossMaxHp(nextBossMaxHp);
      setFloor(nextFloor);
      setPlayerHp(20); // 击杀boss后恢复满血
    } else {
      // Boss 存活 → 扣玩家血
      setBossHp(newBossHp);
      const newPlayerHp = playerHp - 5;
      if (newPlayerHp <= 0) {
        setPlayerHp(0);
        setGameOver('lose');
        return; // 直接返回，不补牌不继续
      }
      setPlayerHp(newPlayerHp);
    }

    // 补牌
    setState(prev => {
      const kept    = prev.hand.filter(c => !selected.includes(c.id));
      const needed  = HAND_SIZE - kept.length;
      const played  = prev.hand.filter(c =>  selected.includes(c.id));
      const newDeck = shuffle([...prev.deck, ...played]);
      const drawn   = newDeck.slice(0, needed);
      const rest    = newDeck.slice(needed);
      return { hand: [...kept, ...drawn], deck: rest };
    });

    setSelected([]);
    setDiscards(MAX_DISCARDS);
    setRound(r => r + 1);
    // 护盾跨回合保留，变色/变费每回合重置
    setSkillCooldowns(prev => ({
      changeColor: false,
      changeCost:  false,
      shield:      prev.shield,
    }));
  }, [selected, evaluation, bossHp, playerHp, floor, gameOver]);

  const clearSelected = useCallback(() => setSelected([]), []);

  // ── 技能1：变色 ──────────────────────────────────────
  const skillChangeColor = useCallback((cardId, newColor) => {
    if (skillCooldowns.changeColor) return;
    setState(prev => ({
      ...prev,
      hand: prev.hand.map(c =>
        c.id === cardId ? { ...c, color: newColor } : c
      ),
    }));
    setSkillCooldowns(prev => ({ ...prev, changeColor: true }));
  }, [skillCooldowns.changeColor]);

  // ── 技能2：变费 ──────────────────────────────────────
  const skillChangeCost = useCallback((cardId, newCost) => {
    if (skillCooldowns.changeCost) return;
    setState(prev => ({
      ...prev,
      hand: prev.hand.map(c =>
        c.id === cardId ? { ...c, cost: newCost } : c
      ),
    }));
    setSkillCooldowns(prev => ({ ...prev, changeCost: true }));
  }, [skillCooldowns.changeCost]);

  // ── 技能3：护盾 ──────────────────────────────────────
  const skillActivateShield = useCallback(() => {
    if (skillCooldowns.shield) return;
    setSkillCooldowns(prev => ({ ...prev, shield: true }));
  }, [skillCooldowns.shield]);

  const breakShield = useCallback(() => {
    setSkillCooldowns(prev => ({ ...prev, shield: false }));
  }, []);

  // ── 重新开始 ──────────────────────────────────────────
  const restartGame = useCallback(() => {
    setState(buildInitialState());
    setSelected([]);
    setDiscards(MAX_DISCARDS);
    setRound(1);
    setTotalScore(0);
    setLastScore(null);
    setPlayerHp(20);
    setBossHp(300);
    setBossMaxHp(300);
    setFloor(1);
    setGameOver(null);
    setSkillCooldowns({ changeColor: false, changeCost: false, shield: false });
  }, []);

  return {
    // 牌
    hand,
    deck,
    deckCount:    deck.length,
    // 选牌
    selected,
    selectedCards,
    toggleSelect,
    clearSelected,
    evaluation,
    // 弃牌
    discardSelected,
    discards,
    maxDiscards:  MAX_DISCARDS,
    canDiscard:   discards > 0 && selected.length > 0,
    canPlay:      selected.length > 0 && !gameOver,
    playHand,
    // 回合
    round,
    totalScore,
    lastScore,
    // 战斗
    playerHp,
    playerMaxHp:  20,
    bossHp,
    bossMaxHp,
    floor,
    gameOver,
    restartGame,
    // 技能
    skillCooldowns,
    skillChangeColor,
    skillChangeCost,
    skillActivateShield,
    breakShield,
  };
}