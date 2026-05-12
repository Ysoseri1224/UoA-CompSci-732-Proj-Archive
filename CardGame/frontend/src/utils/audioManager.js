import { useAudioStore } from '../store/audioStore.js';

class AudioManager {
  constructor() {
    this.bgm = new Audio('/audio/bgm.mp3');
    this.bgm.loop = true;
    this.sfxCache = {}; // 缓存音效实例，避免频繁 new Audio()

    // 1. 初始化时，从 Store 中读取音量并应用
    const state = useAudioStore.getState();
    this.updateVolume(state);

    // 2. 核心逻辑：订阅 Zustand store！
    // 只要玩家在设置里改了音量或静音，这里会自动触发，实时调整底层 Audio 音量
    useAudioStore.subscribe((newState) => {
      this.updateVolume(newState);
    });
  }

  // 内部方法：更新音量
  updateVolume(state) {
    this.bgm.volume = state.isMuted ? 0 : state.bgmVolume;
    this.sfxVolume = state.isMuted ? 0 : state.sfxVolume;
  }

  // 播放背景音乐（在登录页 / LoginPage 的 try...catch 成功时调用）
  playBGM() {
    this.bgm.play().catch(e => console.warn("BGM blocked, waiting for user interaction:", e));
  }

  // 停止背景音乐（在退出登录 / 被踢出时调用）
  stopBGM() {
    this.bgm.pause();
    this.bgm.currentTime = 0; 
  }

  playSFX(name) {
    if (useAudioStore.getState().isMuted) return;

    if (!this.sfxCache[name]) {
      this.sfxCache[name] = new Audio(`/audio/${name}.ogg`); // 假设音效都是 mp3
    }
    
    const sfx = this.sfxCache[name];
    sfx.volume = this.sfxVolume;
    sfx.currentTime = 0; // 重置进度，支持玩家快速连击出牌
    sfx.play().catch(e => console.warn(`SFX .* play failed:`, e));
  }
}

// 导出单例
export const audioManager = new AudioManager();