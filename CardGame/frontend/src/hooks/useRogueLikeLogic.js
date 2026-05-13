import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameLogic } from './useGameLogic.js';
import {
  chooseEnhancement,
  saveRogueProgress,
  notifyFloorWon,
  notifyFloorLost,
} from '../api/rogueapi.js';

export function useRogueLogic(onBattleWin = null) {
  const gameLogic     = useGameLogic(null, { startEvent: 'startRogueGame' });
  const socketRef     = gameLogic.socketRef;
  const chosenElement = gameLogic.chosenElement;

  const [enhancements,        setEnhancements]        = useState([]);
  const [pendingEnhancements, setPendingEnhancements] = useState(null);
  const [canRetryFloor,       setCanRetryFloor]       = useState(false);
  const [showLose,            setShowLose]            = useState(false);
  const [runComplete,         setRunComplete]         = useState(false);

  const victoryTriggeredRef  = useRef(false);
  const winLayerRef          = useRef(0);
  const pendingLayerRef      = useRef(null);
  const onBattleWinRef       = useRef(onBattleWin);
  onBattleWinRef.current     = onBattleWin;
  const playerHpRef          = useRef(gameLogic.playerHp);
  playerHpRef.current        = gameLogic.playerHp;
  const enhancementsRef      = useRef(enhancements);
  enhancementsRef.current    = enhancements;
  const chosenElementRef     = useRef(chosenElement);
  chosenElementRef.current   = chosenElement;

  const floor = gameLogic.floor;

  // Listen for rogue socket events
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const onUpgradeOptions = ({ options }) => {
      setPendingEnhancements(options);
    };

    socket.on('upgradeOptions', onUpgradeOptions);

    const onBattleWinEvt = ({ layer }) => {
      if (victoryTriggeredRef.current) return;
      victoryTriggeredRef.current = true;
      winLayerRef.current = layer;
      onBattleWinRef.current?.(layer);
      notifyFloorWon(layer, playerHpRef.current, enhancementsRef.current).catch(console.error);
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
      socket.off('upgradeOptions', onUpgradeOptions);
      socket.off('battleWin',  onBattleWinEvt);
      socket.off('battleLose', onBattleLoseEvt);
    };
  }, [socketRef, gameLogic.connectionStatus]);

  // L11+ 无限挑战：取消 L10 自动结算，运行只在玩家死亡时终止
  // runComplete 状态保留，预留未来手动结算或自愿退出时使用

  // Auto-save progress (3000ms debounce)
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
    }, 3000);
    return () => clearTimeout(t);
  }, [gameLogic.playerHp, gameLogic.round, gameLogic.bossHp, gameLogic.gameOver, floor, enhancements]);

  // Called by RogueGamePage when boss death animation ends
  // Emits upgradePhaseReady — backend validates roguePhase=UPGRADE then pushes upgradeOptions via socket
  const showEnhancementAfterAnimation = useCallback(() => {
    const layer = pendingLayerRef.current;
    if (layer == null) return;
    pendingLayerRef.current = null;
    const socket = socketRef?.current;
    socket?.emit('upgradePhaseReady');
  }, [socketRef]);

  // Confirm enhancement
  const confirmEnhancement = useCallback((enhancement) => {
    const next = [...enhancementsRef.current, enhancement];
    setEnhancements(next);
    setPendingEnhancements(null);
    victoryTriggeredRef.current = false;

    chooseEnhancement(enhancement).catch(console.error);

    const socket = socketRef?.current;
    socket?.emit('advanceLayer', {
      shuffleCount: 2,
      buffs: next.map(e => e.buff).filter(Boolean),
    });
  }, [socketRef]);

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
      const restoredEnhancements = Array.isArray(cp.enhancements) ? cp.enhancements : [];
      setEnhancements(restoredEnhancements);
      setShowLose(false);
      setCanRetryFloor(false);
      victoryTriggeredRef.current = false;

      socket.emit('restoreFromCheckpoint', {
        layer:        cp.floor,
        playerHp:     cp.playerHp,
        bossHp:       cp.bossHp,
        buffs:        restoredEnhancements.map(e => e.buff).filter(Boolean),
        shuffleCount: 2,
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
    setEnhancements,
    pendingEnhancements,
    confirmEnhancement,
    showEnhancementAfterAnimation,
    canRetryFloor,
    retryFloor,
    showLose,
    runComplete,
  };
}