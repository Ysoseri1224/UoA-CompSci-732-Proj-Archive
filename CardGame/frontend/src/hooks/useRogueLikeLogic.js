import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameLogic } from './useGameLogic.js';
import {
  chooseEnhancement,
  saveRogueProgress,
  notifyFloorWon,
  notifyFloorLost,
} from '../api/rogueapi.js';
import { FIRST_LAYER_UPGRADES, generateUpgradePool } from '../data/upgrades.js';

function buildEnhancementOptions(layer, chosenElement) {
  if (layer === 1) return FIRST_LAYER_UPGRADES;
  return generateUpgradePool(chosenElement ?? 'FIRE', layer);
}

export function useRogueLogic(onBattleWin = null) {
  const gameLogic     = useGameLogic(null);
  const socketRef     = gameLogic._socketRef;
  const chosenElement = gameLogic._chosenElement;

  const [enhancements,        setEnhancements]        = useState([]);
  const [pendingEnhancements, setPendingEnhancements] = useState(null);
  const [canRetryFloor,       setCanRetryFloor]       = useState(false);
  const [showLose,            setShowLose]            = useState(false);
  const [runComplete,         setRunComplete]         = useState(false);

  const victoryTriggeredRef = useRef(false);
  const winLayerRef         = useRef(0);
  const pendingLayerRef     = useRef(null); // layer waiting for boss death animation

  const floor = gameLogic.floor;

  // Listen for rogue socket events
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const onBattleWinEvt = ({ layer }) => {
      if (victoryTriggeredRef.current) return;
      victoryTriggeredRef.current = true;
      winLayerRef.current = layer;
      onBattleWin?.(layer);
      notifyFloorWon(layer, gameLogic.playerHp, enhancements).catch(console.error);
      // Store layer and wait for boss death animation to finish
      pendingLayerRef.current = layer;
    };

    const onBattleLoseEvt = ({ layer }) => {
      setTimeout(() => {
        setShowLose(true);
        setCanRetryFloor(layer > 1);
      }, 2500);
    };

    socket.on('battleWin',  onBattleWinEvt);
    socket.on('battleLose', onBattleLoseEvt);
    return () => {
      socket.off('battleWin',  onBattleWinEvt);
      socket.off('battleLose', onBattleLoseEvt);
    };
  }, [chosenElement, enhancements, gameLogic.playerHp, onBattleWin, socketRef]);

  //  Win detection (layer 10)
  useEffect(() => {
    if (gameLogic.gameOver === 'win' && winLayerRef.current >= 10 && !runComplete) {
      setRunComplete(true);
    }
  }, [gameLogic.gameOver, runComplete]);

  // Auto-save progress
  useEffect(() => {
    if (!gameLogic.bossHp || gameLogic.gameOver) return;
    const t = setTimeout(() => {
      saveRogueProgress({
        layer:       floor,
        playerHp:    gameLogic.playerHp,
        bossHp:      gameLogic.bossHp,
        enhancements,
        stats:       { totalRounds: gameLogic.round },
      }).catch(console.error);
    }, 600);
    return () => clearTimeout(t);
  }, [gameLogic.playerHp, gameLogic.round, gameLogic.bossHp, gameLogic.gameOver, floor, enhancements]);

  // Called by RogueGamePage when boss death animation ends
  const showEnhancementAfterAnimation = useCallback(() => {
    const layer = pendingLayerRef.current;
    if (layer == null) return;
    pendingLayerRef.current = null;
    if (layer >= 10) return;
    setPendingEnhancements(buildEnhancementOptions(layer, chosenElement));
  }, [chosenElement]);

  // Confirm enhancement
  const confirmEnhancement = useCallback((enhancement) => {
    const next = [...enhancements, enhancement];
    setEnhancements(next);
    setPendingEnhancements(null);
    victoryTriggeredRef.current = false;

    chooseEnhancement(enhancement).catch(console.error);

    const socket = socketRef?.current;
    socket?.emit('advanceLayer', {
      shuffleCount: 2,
      buffs: next.map(e => e.buff).filter(Boolean),
    });
  }, [enhancements, socketRef]);

  // Retry floor
  const retryFloor = useCallback(async () => {
    const socket = socketRef?.current;
    if (!socket) return false;

    try {
      const result = await notifyFloorLost();
      if (result.action !== 'restore' || !result.checkpoint) {
        setCanRetryFloor(false);
        return false;
      }

      const cp = result.checkpoint;
      setEnhancements(Array.isArray(cp.enhancements) ? cp.enhancements : []);
      setShowLose(false);
      setCanRetryFloor(false);
      victoryTriggeredRef.current = false;

      socket.emit('restoreFromCheckpoint', {
        layer:    cp.floor,
        playerHp: cp.playerHp,
        bossHp:   cp.bossHp,
      });
      return true;
    } catch (err) {
      console.error('Failed to retry floor:', err);
      return false;
    }
  }, [socketRef]);

  // Restart
  const restartGame = useCallback(() => {
    gameLogic.restartGame();
    setEnhancements([]);
    setPendingEnhancements(null);
    setCanRetryFloor(false);
    setShowLose(false);
    setRunComplete(false);
    victoryTriggeredRef.current = false;
    winLayerRef.current = 0;
  }, [gameLogic]);

  return {
    ...gameLogic,
    restartGame,
    enhancements,
    pendingEnhancements,
    confirmEnhancement,
    showEnhancementAfterAnimation,
    canRetryFloor,
    retryFloor,
    showLose,
    runComplete,
  };
}