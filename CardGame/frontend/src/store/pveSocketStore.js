import { create } from 'zustand';

const initialServerState = {
  hand: [],
  deckCount: 0,
  discardCount: 0,
  player: { hp: 20, maxHp: 20, buffs: [], chosenElement: null },
  boss: null,
  round: 1,
  floor: 1,
  phase: 'DRAW',
  skills: {
    energy: 3,
    shield: { active: false, onCooldown: false },
  },
  shuffle: { remaining: 0, pendingDiscard: [] },
  play: { selectedCards: [], handType: null, score: null },
  bossRound: { intent: 'ATTACK', isDefending: false, willReleaseCharge: false },
  battleResult: 'ONGOING',
  shieldActive: false,
  gameOver: null,
};

const initialMetaState = {
  connectionStatus: 'idle',
  lastError: null,
  roomId: null,
  hasStarted: false,
};

const usePveSocketStore = create((set) => ({
  ...initialServerState,
  ...initialMetaState,

  applyServerState: (payload) => set({
    ...payload,
    hasStarted: true,
    lastError: null,
  }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setError: (lastError) => set({ lastError }),
  setRoomId: (roomId) => set({ roomId }),

  reset: () => set({
    ...initialServerState,
    ...initialMetaState,
  }),
}));

export default usePveSocketStore;
