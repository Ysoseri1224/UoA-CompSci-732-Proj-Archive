// src/components/game/Battlefield.jsx
import { useState, useEffect, useRef } from 'react';
import BossVideoDisplay from './BossVideoDisplay';
import BattlefieldVideoBackground from './BattlefieldVideoBackground';
import '../../styles/battlefield.css';

/** Feather boss video into abyss ring — masks hard rectangle edges while keeping torso readable. */
const BOSS_FEATHER_MASK =
  'radial-gradient(ellipse 104% 124% at 50% 58%, #000 0%, #000 54%, rgba(0,0,0,0.38) 80%, transparent 98%)';

function DamageFloat({ value }) {
  return (
    <div style={{
      position: 'absolute',
      top: '15%', left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      animation: 'floatUp 1.2s ease-out forwards',
      pointerEvents: 'none',
      fontFamily: 'monospace',
      fontWeight: 900,
      fontSize: 40,
      color: '#ff4444',
      textShadow: '0 0 20px rgba(255,50,50,0.9), 0 2px 4px rgba(0,0,0,0.9)',
      whiteSpace: 'nowrap',
    }}>
      -{value.toLocaleString()}
    </div>
  );
}

const ATTACK_EFFECT_META = {
  normal: { label: 'Multi-Slash', particles: 28 },
  fire: { label: 'Lava Eruption', particles: 42 },
  water: { label: 'Abyssal Vortex', particles: 44 },
  nature: { label: 'Root Impale', particles: 42 },
};

const SPRITE_EFFECTS = {
  normal: {
    sheet: '/effects/normal-c-sheet.png',
    top: '50%',
    scale: 1.05,
    fps: 24,
  },
  fire: {
    sheet: '/effects/fire-a-sheet.png',
    top: '58%',
    scale: 1.16,
    fps: 22,
  },
  water: {
    sheet: '/effects/water-b-sheet.png?v=2',
    top: '52%',
    scale: 1.15,
    fps: 24,
  },
  nature: {
    sheet: '/effects/nature-b-sheet.png',
    top: '58%',
    scale: 1.14,
    fps: 22,
  },
};

function SpriteSheetEffect({ mode = 'normal' }) {
  const sprite = SPRITE_EFFECTS[mode] ?? SPRITE_EFFECTS.normal;
  const [frame, setFrame] = useState(0);
  const frameSize = 512;
  const columns = 4;
  const frames = 16;
  const x = frame % columns;
  const y = Math.floor(frame / columns);

  useEffect(() => {
    setFrame(0);

    const timer = window.setInterval(() => {
      setFrame(current => {
        if (current >= frames - 1) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 1000 / sprite.fps);

    return () => window.clearInterval(timer);
  }, [mode, sprite.fps]);

  return (
    <div
      className="attack-effect__sprite"
      style={{
        '--sprite-top': sprite.top,
        '--sprite-scale': sprite.scale,
        width: frameSize,
        height: frameSize,
        backgroundImage: `url(${sprite.sheet})`,
        backgroundSize: `${frameSize * columns}px ${frameSize * columns}px`,
        backgroundPosition: `-${x * frameSize}px -${y * frameSize}px`,
      }}
    />
  );
}

function AttackEffect({ mode = 'normal' }) {
  const meta = ATTACK_EFFECT_META[mode] ?? ATTACK_EFFECT_META.normal;
  const particles = Array.from({ length: meta.particles });

  return (
    <div className={`attack-effect attack-effect--${mode}`}>
      <div className="attack-effect__label">{meta.label}</div>
      <div className="attack-effect__flash" />
      <div className="attack-effect__ring attack-effect__ring--one" />
      <div className="attack-effect__ring attack-effect__ring--two" />
      <SpriteSheetEffect mode={mode} />

      {mode === 'normal' && (
        <>
          <div className="attack-effect__slash attack-effect__slash--one" />
          <div className="attack-effect__slash attack-effect__slash--two" />
          <div className="attack-effect__slash attack-effect__slash--three" />
          <div className="attack-effect__slash attack-effect__slash--four" />
          <div className="attack-effect__shockline attack-effect__shockline--one" />
          <div className="attack-effect__shockline attack-effect__shockline--two" />
          <div className="attack-effect__blade-burst" />
        </>
      )}

      {mode === 'fire' && (
        <>
          <div className="attack-effect__ground-crack" />
          <div className="attack-effect__lava-burst attack-effect__lava-burst--one" />
          <div className="attack-effect__lava-burst attack-effect__lava-burst--two" />
          <div className="attack-effect__lava-burst attack-effect__lava-burst--three" />
          <div className="attack-effect__flame attack-effect__flame--one" />
          <div className="attack-effect__flame attack-effect__flame--two" />
          <div className="attack-effect__flame attack-effect__flame--three" />
        </>
      )}

      {mode === 'water' && (
        <>
          <div className="attack-effect__abyss-vortex" />
          <div className="attack-effect__vortex-core" />
          <div className="attack-effect__vortex-ring attack-effect__vortex-ring--one" />
          <div className="attack-effect__vortex-ring attack-effect__vortex-ring--two" />
          <div className="attack-effect__vortex-ring attack-effect__vortex-ring--three" />
          <div className="attack-effect__foam attack-effect__foam--one" />
          <div className="attack-effect__foam attack-effect__foam--two" />
          <div className="attack-effect__wave attack-effect__wave--one" />
          <div className="attack-effect__wave attack-effect__wave--two" />
          <div className="attack-effect__wave attack-effect__wave--three" />
        </>
      )}

      {mode === 'nature' && (
        <>
          <div className="attack-effect__root-slam attack-effect__root-slam--one" />
          <div className="attack-effect__root-slam attack-effect__root-slam--two" />
          <div className="attack-effect__vine attack-effect__vine--one" />
          <div className="attack-effect__vine attack-effect__vine--two" />
          <div className="attack-effect__vine attack-effect__vine--three" />
          <div className="attack-effect__bloom" />
        </>
      )}

      <div className="attack-effect__particles">
        {particles.map((_, index) => (
          <span
            key={index}
            style={{
              '--i': index,
              '--angle': `${(360 / meta.particles) * index}deg`,
              '--distance': `${86 + (index % 5) * 18}px`,
              '--delay': `${(index % 6) * 0.035}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const BOSS_INTENT_STYLE = {
  ATTACK: {
    background: 'radial-gradient(circle at 35% 28%, #ff4422, #660a00)',
    border: '2px solid rgba(255,130,110,0.85)',
    boxShadow: '0 0 12px rgba(255,60,30,0.5), 0 3px 8px rgba(0,0,0,0.7)',
  },
  CHARGE: {
    background: 'radial-gradient(circle at 35% 28%, #f0c030, #7a5000)',
    border: '2px solid rgba(255,215,96,0.85)',
    boxShadow: '0 0 12px rgba(220,170,0,0.4), 0 3px 8px rgba(0,0,0,0.7)',
  },
  DEFEND: {
    background: 'radial-gradient(circle at 35% 28%, #4488ff, #001855)',
    border: '2px solid rgba(110,170,255,0.85)',
    boxShadow: '0 0 12px rgba(60,120,255,0.5), 0 3px 8px rgba(0,0,0,0.7)',
  },
};

export default function Battlefield({
  bossHp, bossMaxHp,
  bossName,
  floor, lastScore,
  battlePhase,
  phase,
  bossRound,
  bossIntent,
  bossAttack,
  attackEffect,
  gameOver,
  onBossAttackStart,
  onBossAttackEnded,
  onBossDefeatedAnimationEnd,
}) {
  const playerWon = gameOver === 'win';
  const playerLost = gameOver === 'lose';

  const [floats,  setFloats]  = useState([]);
  const prevScore             = useRef(null);
  const [bossHit, setBossHit] = useState(false);
  const prevBossHp            = useRef(bossHp);

  useEffect(() => {
    if (lastScore && lastScore !== prevScore.current) {
      prevScore.current = lastScore;
      const id = Date.now();
      setFloats(f => [...f, { id, value: lastScore }]);
      setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1300);
    }
  }, [lastScore]);

  useEffect(() => {
    if (bossHp < prevBossHp.current) {
      setBossHit(true);
      setTimeout(() => setBossHit(false), 400);
    }
    prevBossHp.current = bossHp;
  }, [bossHp]);

  return (
    <>
      <div style={{
        position: 'relative', flex: 1,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        borderLeft:  '1px solid rgba(200,160,70,0.2)',
        borderRight: '1px solid rgba(200,160,70,0.2)',
        background: '#050302',
        animation: battlePhase === 'boss' ? 'bossAttackFlash 1s ease-in-out' : 'none',
      }}>

        <BattlefieldVideoBackground battlePhase={battlePhase} />

        {/* 层数标签 */}
        <div style={{
          position: 'absolute', top: 10, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,0.65)',
          border: '1px solid rgba(200,160,70,0.25)',
          borderRadius: 20, padding: '3px 14px',
          backdropFilter: 'blur(6px)',
          zIndex: 50,
        }}>
          <span style={{ color: '#c8a040', fontSize: 11, fontFamily: 'monospace', letterSpacing: 3 }}>
            Floor {floor}
          </span>
          {floor > 1 && (
            <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 700 }}>
              ▲ BOSS HP +{Math.round((Math.pow(1.5, floor - 1) - 1) * 100)}%
            </span>
          )}
        </div>

        {/* ── 战斗阶段提示横幅 ── */}
        {battlePhase && battlePhase !== 'player' && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 60, pointerEvents: 'none',
            animation: 'fadeInOut 0.4s ease',
          }}>
            <div style={{
              padding: '12px 32px',
              borderRadius: 12,
              fontFamily: 'monospace',
              fontWeight: 900,
              letterSpacing: 3,
              fontSize: 18,
              textAlign: 'center',
              ...(battlePhase === 'boss' ? {
                background: 'rgba(120,0,0,0.9)',
                border: '1px solid #ff3333',
                color: '#ff8888',
                boxShadow: '0 0 24px rgba(255,0,0,0.6), 0 4px 16px rgba(0,0,0,0.6)',
              } : {
                background: 'rgba(0,50,160,0.9)',
                border: '1px solid #60a5fa',
                color: '#bfdbfe',
                boxShadow: '0 0 24px rgba(59,130,246,0.6), 0 4px 16px rgba(0,0,0,0.6)',
              }),
            }}>
              {battlePhase === 'boss'        && '💀  BOSS TURN'}
              {battlePhase === 'shield_break' && '🛡️  SHIELD ABSORB!'}
            </div>
          </div>
        )}

        {/* ── BOSS 区域 — 前景层；手牌栏通过 GamePage sibling z-index 压在其上 ── */}
        <div className="battlefield-boss-area" style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, paddingTop: 32,
          position: 'relative',
          zIndex: 45,
        }}>

          <div className="battlefield-attack-effects-host" aria-hidden>
            {attackEffect ? <AttackEffect key={attackEffect.id} mode={attackEffect.mode} /> : null}
          </div>

          {/* 伤害飘字 */}
          {floats.map(f => <DamageFloat key={f.id} value={f.value} />)}

          {/* Boss 氛围光 — 下移与立柱对齐 */}
          <div className="battlefield-boss-glow" style={{
            position: 'absolute', top: '26%', left: '50%',
            transform: 'translate(-50%, 0)',
            width: 'clamp(120px, 24vmin, 280px)',
            height: 'clamp(100px, 20vmin, 240px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(120,40,140,0.2) 0%, rgba(80,15,120,0.1) 45%, transparent 78%)',
            filter: 'blur(22px)',
            pointerEvents: 'none',
            zIndex: 8,
          }} />

          {/* Boss 立柱：整体下移对齐圆环几何中心 */}
          <div className="battlefield-boss-stack" style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            width: 'clamp(132px, 20vmin, 228px)',
            maxWidth: 'min(228px, 36vw)',
            transform: 'translateY(clamp(16px, 3.2vmin, 32px))',
          }}>
            <div className="battlefield-boss-video-frame" style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '3 / 5',
              maxHeight: 'clamp(200px, 30vmin, 300px)',
              borderRadius: 14,
              overflow: 'hidden',
              background: `
                radial-gradient(ellipse 90% 88% at 50% 70%, rgba(24,14,42,0.55) 0%, rgba(4,6,14,1) 75%),
                linear-gradient(180deg, rgba(10,10,24,1) 0%, rgba(2,4,12,1) 100%)
              `,
              WebkitMaskImage: BOSS_FEATHER_MASK,
              maskImage: BOSS_FEATHER_MASK,
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              boxShadow: bossHit
                ? '0 0 26px rgba(255,60,70,0.32), inset 0 1px 0 rgba(255,255,255,0.06)'
                : '0 16px 36px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.04)',
              animation: bossHit ? 'bossShake 0.4s ease' : 'none',
              filter: bossHit ? 'brightness(1.12) saturate(1.22)' : 'brightness(1.02)',
              transition: 'filter 0.15s ease, box-shadow 0.2s ease',
            }}>
              <BossVideoDisplay
                bossHp={bossHp}
                phase={phase}
                battlePhase={battlePhase}
                playerWon={playerWon}
                playerLost={playerLost}
                onAttackStart={onBossAttackStart}
                onAttackEnded={onBossAttackEnded ?? (() => {})}
                onDefeatedAnimationEnd={onBossDefeatedAnimationEnd ?? (() => {})}
              />

              {/* 内缘柔化与深渊融合的暗角 */}
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                pointerEvents: 'none',
                zIndex: 9,
                boxShadow:
                  'inset 0 0 52px rgba(0,0,0,0.62), inset 0 18px 40px rgba(8,6,26,0.45), inset 0 -36px 64px rgba(4,4,14,0.75)',
              }} />

              {/* 底部轻压暗 — 仅占底缘 */}
              <div style={{
                position: 'absolute',
                left: 0, right: 0, bottom: 0,
                height: '24%',
                background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 100%)',
                pointerEvents: 'none',
                zIndex: 11,
              }} />
            </div>

            {/* 名称 / 攻防 — 窄于或过宽时用 maxWidth 对齐立柱 */}
            <div className="battlefield-boss-info-row" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(6px, 1.8vmin, 12px)',
              flexWrap: 'wrap',
              padding: '0 2px',
              maxWidth: 'min(260px, 42vw)',
            }}>
              {(() => {
                const intent = bossIntent ?? 'ATTACK';
                const style = BOSS_INTENT_STYLE[intent] ?? BOSS_INTENT_STYLE.ATTACK;
                const isAttack = intent === 'ATTACK';
                return (
                  <div style={{
                    width: 'clamp(36px, 6vmin, 44px)',
                    height: 'clamp(36px, 6vmin, 44px)',
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: style.background,
                    border: style.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                    fontWeight: 900, color: '#fff',
                    boxShadow: style.boxShadow,
                    fontFamily: 'monospace',
                    textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                    lineHeight: 1.1,
                    textAlign: 'center',
                    padding: '2px',
                    gap: 0,
                  }}>
                    {isAttack ? (
                      <>
                        <span style={{ fontSize: 'clamp(9px, 1.6vmin, 11px)', opacity: 0.85 }}>🗡</span>
                        <span style={{ fontSize: bossAttack > 99 ? 'clamp(7px, 1.5vmin, 9px)' : 'clamp(9px, 1.8vmin, 12px)' }}>
                          {bossAttack ?? '?'}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 'clamp(14px, 2.8vmin, 18px)' }}>
                        {intent === 'CHARGE' ? '⚡' : '🛡'}
                      </span>
                    )}
                  </div>
                );
              })()}
              <div style={{
                minWidth: 0,
                textAlign: 'center',
                padding: '4px clamp(10px, 3vmin, 16px)',
                borderRadius: 999,
                background: 'linear-gradient(90deg, rgba(0,0,0,0.2), rgba(0,0,0,0.72), rgba(0,0,0,0.2))',
                border: '1px solid rgba(200,160,90,0.22)',
              }}>
                <span className="battlefield-boss-name-inline" style={{
                  color: '#e8cfa0',
                  fontSize: 'clamp(10px, 2.2vmin, 12px)',
                  fontWeight: 800,
                  letterSpacing: 2,
                  fontFamily: 'serif',
                  textShadow: '0 0 10px rgba(200,170,110,0.32), 0 1px 3px rgba(0,0,0,1)',
                  whiteSpace: 'nowrap',
                }}>
                  {bossName ?? 'Shadow Lord'}
                </span>
              </div>
              <div style={{
                width: 'clamp(36px, 6vmin, 44px)',
                height: 'clamp(36px, 6vmin, 44px)',
                flexShrink: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 28%, #cc2222, #440808)',
                border: '2px solid rgba(255,110,110,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900,
                fontSize: bossHp > 999 ? 9 : 'clamp(12px, 2.6vmin, 15px)',
                color: '#fff',
                boxShadow: '0 0 12px rgba(200,30,40,0.45), 0 3px 8px rgba(0,0,0,0.7)',
                fontFamily: '"Cinzel", monospace',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              }}>
                {bossHp > 9999
                  ? `${Math.round(bossHp/1000)}k`
                  : bossHp > 999
                    ? `${(bossHp/1000).toFixed(1)}k`
                    : bossHp
                }
              </div>
            </div>

            {/* Boss intent indicator */}
            {bossRound ? (
              <div style={{
                marginTop: 'clamp(4px, 1vmin, 8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '4px 14px',
                borderRadius: 12,
                background: bossRound.intent === 'CHARGE'
                  ? 'rgba(255,100,20,0.18)'
                  : bossRound.intent === 'DEFEND'
                    ? 'rgba(60,140,255,0.18)'
                    : 'rgba(255,200,60,0.14)',
                border: `1px solid ${bossRound.intent === 'CHARGE'
                  ? 'rgba(255,100,20,0.5)'
                  : bossRound.intent === 'DEFEND'
                    ? 'rgba(60,140,255,0.5)'
                    : 'rgba(255,200,60,0.4)'}`,
                color: bossRound.intent === 'CHARGE'
                  ? '#ffa45e'
                  : bossRound.intent === 'DEFEND'
                    ? '#7eb8ff'
                    : '#f0d060',
                fontSize: 'clamp(10px, 1.8vmin, 12px)',
                fontWeight: 700,
                fontFamily: 'monospace',
                letterSpacing: 1.5,
                textShadow: '0 0 8px rgba(0,0,0,0.8)',
              }}>
                <span>
                  {bossRound.intent === 'ATTACK' ? '⚔' : bossRound.intent === 'CHARGE' ? '⚡' : '\u{1F6E1}'}
                </span>
                <span>{bossRound.intent}</span>
                {bossRound.willReleaseCharge ? <span>NEXT: BURST</span> : null}
                {bossRound.isDefending ? <span>DMG -50%</span> : null}
              </div>
            ) : null}

          </div>
        </div>

      </div>
    </>
  );
}
