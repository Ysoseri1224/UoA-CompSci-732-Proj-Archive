import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 管理游戏声音设置的 Store
export const useAudioStore = create(
  persist(
    (set) => ({
      bgmVolume: 0.5,     // 背景音乐音量 (0 - 1)
      sfxVolume: 0.8,     // 音效音量 (0 - 1)
      isMuted: false,     // 全局静音开关

      setBgmVolume: (volume) => set({ bgmVolume: volume }),
      setSfxVolume: (volume) => set({ sfxVolume: volume }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
    }),
    {
      name: 'game-audio-settings', // 自动保存在 localStorage 中的 key
    }
  )
);