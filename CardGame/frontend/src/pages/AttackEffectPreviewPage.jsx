import { useEffect, useMemo, useState } from 'react';
import Battlefield from '../components/game/Battlefield';

const EFFECTS = [
  {
    mode: 'normal',
    title: '普通 C · 乱刃终击',
    subtitle: '多段交叉刀光与白金冲击',
    accent: '#f8d36a',
  },
  {
    mode: 'fire',
    title: '火系 A · 熔岩爆燃',
    subtitle: '地裂、熔岩柱、火星喷发',
    accent: '#ff5a12',
  },
  {
    mode: 'water',
    title: '水系 B · 深海漩涡',
    subtitle: '漩涡绞杀、水环与泡沫飞溅',
    accent: '#4ed3ff',
  },
  {
    mode: 'nature',
    title: '草系 B · 森根突刺',
    subtitle: '树根破土突刺与藤蔓爆生',
    accent: '#74e05e',
  },
];

export default function AttackEffectPreviewPage() {
  const [activeMode, setActiveMode] = useState('fire');
  const [attackEffect, setAttackEffect] = useState(null);
  const [autoPlay, setAutoPlay] = useState(false);

  const activeEffect = useMemo(
    () => EFFECTS.find(effect => effect.mode === activeMode) ?? EFFECTS[0],
    [activeMode]
  );

  function playEffect(mode = activeMode) {
    setActiveMode(mode);
    setAttackEffect({ id: Date.now(), mode });
    window.setTimeout(() => setAttackEffect(null), 1250);
  }

  useEffect(() => {
    playEffect(activeMode);
    // Run once on entry so the page is not blank.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoPlay) return undefined;

    let index = EFFECTS.findIndex(effect => effect.mode === activeMode);
    const interval = window.setInterval(() => {
      index = (index + 1) % EFFECTS.length;
      playEffect(EFFECTS[index].mode);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [activeMode, autoPlay]);

  return (
    <div
      className="min-h-[calc(100dvh-var(--navbar-height))] overflow-hidden bg-[#050403] text-stone-100"
      style={{
        background: 'radial-gradient(ellipse 80% 70% at 50% 30%, #201506, #050403 72%)',
      }}
    >
      <div className="flex h-[calc(100dvh-var(--navbar-height))] min-h-[680px] flex-col">
        <div className="flex items-center justify-between border-b border-yellow-900/40 px-6 py-4">
          <div>
            <div className="font-mono text-xs tracking-[0.35em] text-yellow-700">
              ATTACK EFFECT PREVIEW
            </div>
            <h1 className="mt-1 text-xl font-black tracking-widest text-yellow-200">
              出牌攻击特效预览
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAutoPlay(value => !value)}
              className={`rounded-md border px-4 py-2 text-xs font-black tracking-widest transition
                ${autoPlay
                  ? 'border-yellow-400 bg-yellow-500/20 text-yellow-100 shadow-[0_0_18px_rgba(234,179,8,0.32)]'
                  : 'border-stone-700 bg-stone-950/70 text-stone-400 hover:border-yellow-700 hover:text-yellow-300'
                }`}
            >
              {autoPlay ? '停止轮播' : '自动轮播'}
            </button>
            <button
              type="button"
              onClick={() => playEffect(activeMode)}
              className="rounded-md border border-yellow-600 bg-yellow-600/20 px-4 py-2 text-xs font-black tracking-widest text-yellow-100 shadow-[0_0_18px_rgba(234,179,8,0.22)] transition hover:bg-yellow-500/30"
            >
              重播当前
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-[minmax(0,1fr)_260px] overflow-hidden">
          <div className="relative flex min-w-0 overflow-hidden">
            <Battlefield
              bossHp={300}
              bossMaxHp={300}
              floor={2}
              lastScore={null}
              battlePhase={null}
              attackEffect={attackEffect}
            />
          </div>

          <aside className="flex flex-col border-l border-yellow-900/40 bg-stone-950/85 p-4">
            <div className="mb-4 rounded-md border border-yellow-900/40 bg-black/30 p-4">
              <div className="text-xs font-mono tracking-[0.25em] text-yellow-800">
                CURRENT
              </div>
              <div
                className="mt-2 text-2xl font-black tracking-widest"
                style={{ color: activeEffect.accent }}
              >
                {activeEffect.title}
              </div>
              <div className="mt-1 text-xs tracking-widest text-stone-500">
                {activeEffect.subtitle}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {EFFECTS.map(effect => {
                const isActive = effect.mode === activeMode;

                return (
                  <button
                    key={effect.mode}
                    type="button"
                    onClick={() => playEffect(effect.mode)}
                    className={`group rounded-md border p-3 text-left transition active:scale-[0.98]
                      ${isActive
                        ? 'bg-white/[0.07] shadow-[0_0_22px_rgba(0,0,0,0.38)]'
                        : 'border-stone-800 bg-black/25 hover:bg-white/[0.04]'
                      }`}
                    style={{
                      borderColor: isActive ? effect.accent : undefined,
                      boxShadow: isActive ? `0 0 22px ${effect.accent}33` : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="text-sm font-black tracking-widest"
                        style={{ color: isActive ? effect.accent : '#d6d3d1' }}
                      >
                        {effect.title}
                      </span>
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          background: effect.accent,
                          boxShadow: `0 0 14px ${effect.accent}`,
                        }}
                      />
                    </div>
                    <div className="mt-1 text-xs tracking-widest text-stone-500">
                      {effect.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto border-t border-yellow-900/30 pt-4 text-xs leading-6 text-stone-500">
              点选不同模式即可播放预览。这里复用正式战斗里的同一套特效，选定后可以直接按同样效果进游戏。
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
