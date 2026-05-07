import { useState, useCallback, useMemo } from 'react';
import { CARD_POOL } from '../data/cards';
import { HAND_TYPES } from '../data/handTypes';

const HAND_SIZE = 7;
const MAX_SELECT = 5;
const MAX_DISCARDS = 2;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

export function evaluateHand(cards) {
  const handType    = getHandType(cards);
  const baseAttack  = cards.reduce((sum, c) => sum + c.cost, 0);
  const bonusAttack = handType.baseBonus;
  const multiplier  = handType.multiplier;
  const totalScore  = Math.round((baseAttack + bonusAttack) * multiplier);
  return { handType, baseAttack, bonusAttack, multiplier, totalScore };
}

function getAttackEffectMode(cards) {
  if (cards.length !== MAX_SELECT) return 'normal';

  const firstColor = cards[0]?.color;
  const isSameColor = cards.every(card => card.color === firstColor);
  if (!isSameColor) return 'normal';

  if (firstColor === 'red') return 'fire';
  if (firstColor === 'blue') return 'water';
  if (firstColor === 'green') return 'nature';
  return 'normal';
}

function buildInitialState() {
  const shuffled = shuffle(CARD_POOL);
  return {
    hand: shuffled.slice(0, HAND_SIZE),
    deck: shuffled.slice(HAND_SIZE),
  };
}

export function useGameLogic() {
  const [{ hand, deck }, setState] = useState(buildInitialState);
  const [selected,    setSelected]   = useState([]);
  const [discards,    setDiscards]   = useState(MAX_DISCARDS);
  const [round,       setRound]      = useState(1);
  const [totalScore,  setTotalScore] = useState(0);
  const [lastScore,   setLastScore]  = useState(null);

  const [skillCooldowns, setSkillCooldowns] = useState({ shield: false });
  const [skillCharges,   setSkillCharges]   = useState(3);

  const [playerHp,     setPlayerHp]     = useState(20);
  const [bossHp,       setBossHp]       = useState(300);
  const [bossMaxHp,    setBossMaxHp]    = useState(300);
  const [floor,        setFloor]        = useState(1);
  const [gameOver,     setGameOver]     = useState(null);
  const [battlePhase,  setBattlePhase]  = useState(null);
  const [bossAttacking,setBossAttacking]= useState(false);
  const [attackEffect,setAttackEffect]  = useState(null);

  const selectedCards = useMemo(
    () => selected.map(id => hand.find(c => c.id === id)).filter(Boolean),
    [hand, selected]
  );

  const evaluation = useMemo(() => evaluateHand(selectedCards), [selectedCards]);

  const toggleSelect = useCallback((cardId) => {
    setSelected(prev => {
      if (prev.includes(cardId)) return prev.filter(id => id !== cardId);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, cardId];
    });
  }, []);

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

  const playHand = useCallback(() => {
    if (selected.length === 0 || gameOver || battlePhase) return;

    const score     = evaluation.totalScore;
    const newBossHp = bossHp - score;
    const effectMode = getAttackEffectMode(selectedCards);

    setLastScore(score);
    setTotalScore(prev => prev + score);
    setBattlePhase('player');
    setAttackEffect({ id: Date.now(), mode: effectMode });
    setTimeout(() => setAttackEffect(null), 1200);

    if (newBossHp <= 0) {
      setBossHp(0);
      setTimeout(() => {
        const nextFloor     = floor + 1;
        const nextBossMaxHp = Math.round(300 * Math.pow(1.5, nextFloor - 1));
        setBossHp(nextBossMaxHp);
        setBossMaxHp(nextBossMaxHp);
        setFloor(nextFloor);
        setPlayerHp(20);
        setBattlePhase(null);
      }, 1200);
    } else {
      setBossHp(newBossHp);

      setTimeout(() => {
        setBattlePhase('boss');
        setBossAttacking(true);

        setTimeout(() => {
          setBossAttacking(false);

          if (skillCooldowns.shield) {
            setBattlePhase('shield_break');
            setSkillCooldowns({ shield: false });
            setTimeout(() => setBattlePhase(null), 800);
          } else {
            const newPlayerHp = playerHp - 5;
            if (newPlayerHp <= 0) {
              setPlayerHp(0);
              setGameOver('lose');
              setBattlePhase(null);
              return;
            }
            setPlayerHp(newPlayerHp);
            setTimeout(() => setBattlePhase(null), 600);
          }
        }, 800);
      }, 1400);
    }

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
    // 护盾跨回合保留，充能值不重置
    setSkillCooldowns(prev => ({ shield: prev.shield }));
  }, [selected, selectedCards, evaluation, bossHp, playerHp, floor, gameOver, battlePhase, skillCooldowns.shield]);

  const clearSelected = useCallback(() => setSelected([]), []);

  // ── 技能1：变色 ──────────────────────────────────────
  const skillChangeColor = useCallback((cardId, newColor) => {
    if (skillCharges <= 0) return;

    setState(prev => {
      const card = prev.hand.find(c => c.id === cardId);
      if (!card) return prev;

      let template = CARD_POOL.find(c =>
        c.color === newColor && c.cost === card.cost
      );
      if (!template) {
        template = CARD_POOL
          .filter(c => c.color === newColor)
          .sort((a, b) =>
            Math.abs(a.cost - card.cost) - Math.abs(b.cost - card.cost)
          )[0];
      }
      if (!template) return prev;

      const transformed = { ...template, id: `transformed_${Date.now()}` };
      return {
        ...prev,
        hand: prev.hand.map(c => c.id === cardId ? transformed : c),
      };
    });

    setSkillCharges(s => s - 1);
  }, [skillCharges]);

  // ── 技能2：变费 ──────────────────────────────────────
  const skillChangeCost = useCallback((cardId, newCost) => {
    if (skillCharges <= 0) return;

    setState(prev => {
      const card = prev.hand.find(c => c.id === cardId);
      if (!card) return prev;

      const template = CARD_POOL.find(c =>
        c.color === card.color && c.cost === newCost
      );
      if (!template) return prev;

      const transformed = { ...template, id: `transformed_${Date.now()}` };
      return {
        ...prev,
        hand: prev.hand.map(c => c.id === cardId ? transformed : c),
      };
    });

    setSkillCharges(s => s - 1);
  }, [skillCharges]);

  // ── 技能3：护盾 ──────────────────────────────────────
  const skillActivateShield = useCallback(() => {
    if (skillCharges <= 0 || skillCooldowns.shield) return;
    setSkillCharges(s => s - 1);
    setSkillCooldowns({ shield: true });
  }, [skillCharges, skillCooldowns.shield]);

  const breakShield = useCallback(() => {
    setSkillCooldowns({ shield: false });
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
    setBattlePhase(null);
    setBossAttacking(false);
    setAttackEffect(null);
    setSkillCooldowns({ shield: false });
    setSkillCharges(3);
  }, []);

  return {
    hand,
    deck,
    deckCount:    deck.length,
    selected,
    selectedCards,
    toggleSelect,
    clearSelected,
    evaluation,
    discardSelected,
    discards,
    maxDiscards:  MAX_DISCARDS,
    canDiscard:   discards > 0 && selected.length > 0,
    canPlay:      selected.length > 0 && !gameOver,
    playHand,
    round,
    totalScore,
    lastScore,
    playerHp,
    playerMaxHp:  20,
    bossHp,
    bossMaxHp,
    floor,
    gameOver,
    restartGame,
    battlePhase,
    attackEffect,
    bossAttacking,
    skillCooldowns,
    skillCharges,
    skillChangeColor,
    skillChangeCost,
    skillActivateShield,
    breakShield,
  };
}
