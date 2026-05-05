// src/components/game/Battlefield.jsx
import { useState, useEffect, useRef } from 'react';

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

export default function Battlefield({
  bossHp, bossMaxHp,
  floor, lastScore,
  battlePhase,
}) {
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
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0px)   scale(1.3); }
          30%  { opacity: 1; transform: translateX(-50%) translateY(-24px) scale(1.5); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-90px) scale(0.8); }
        }
        @keyframes bossShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-7px); }
          40%     { transform: translateX(7px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
        @keyframes fadeInOut {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          30%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
@keyframes bossAttackFlash {
  0%   { background: rgba(120,0,0,0.0); }
  40%  { background: rgba(200,0,0,0.12); }
  100% { background: rgba(120,0,0,0.0); }
}
      `}</style>

      <div style={{
        position: 'relative', flex: 1,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        borderLeft:  '1px solid rgba(200,160,70,0.2)',
        borderRight: '1px solid rgba(200,160,70,0.2)',
        background: `
          repeating-linear-gradient(
            0deg,
            transparent, transparent 59px,
            rgba(200,160,70,0.08) 59px, rgba(200,160,70,0.08) 60px
          ),
          repeating-linear-gradient(
            90deg,
            transparent, transparent 59px,
            rgba(200,160,70,0.08) 59px, rgba(200,160,70,0.08) 60px
          ),
          url('/images/battlefield.png') center/cover no-repeat
        `,
        // Boss 攻击时整体红闪
        animation: battlePhase === 'boss' ? 'bossAttackFlash 1s ease-in-out' : 'none',
      }}>

        {/* 层数标签 */}
        <div style={{
          position: 'absolute', top: 10, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,0.65)',
          border: '1px solid rgba(200,160,70,0.25)',
          borderRadius: 20, padding: '3px 14px',
          backdropFilter: 'blur(6px)',
          zIndex: 5,
        }}>
          <span style={{ color: '#c8a040', fontSize: 11, fontFamily: 'monospace', letterSpacing: 3 }}>
            第 {floor} 层
          </span>
          {floor > 1 && (
            <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 700 }}>
              ▲ BOSS HP +{Math.round((Math.pow(1.5, floor - 1) - 1) * 100)}%
            </span>
          )}
        </div>

        {/* ── 战斗阶段提示横幅 ── */}
        {battlePhase && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20, pointerEvents: 'none',
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
              ...(battlePhase === 'player' ? {
                background: 'rgba(160,80,0,0.9)',
                border: '1px solid #ff8c00',
                color: '#ffd700',
                boxShadow: '0 0 24px rgba(255,140,0,0.6), 0 4px 16px rgba(0,0,0,0.6)',
              } : battlePhase === 'boss' ? {
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
              {battlePhase === 'player'      && '⚔️  玩家攻击！'}
              {battlePhase === 'boss'        && '💀  BOSS 回合'}
              {battlePhase === 'shield_break' && '🛡️  护盾吸收！'}
            </div>
          </div>
        )}

        {/* ── BOSS 区域 ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, paddingTop: 40,
          position: 'relative',
        }}>

          {/* 伤害飘字 */}
          {floats.map(f => <DamageFloat key={f.id} value={f.value} />)}

          {/* Boss 氛围光 */}
          <div style={{
            position: 'absolute', top: '20%', left: '50%',
            transform: 'translateX(-50%)',
            width: 200, height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,20,20,0.25) 0%, transparent 70%)',
            filter: 'blur(24px)',
            pointerEvents: 'none',
          }} />

          {/* Boss 炉石风格卡牌 */}
          <div style={{
            position: 'relative',
            width: 140, height: 190,
            animation: bossHit ? 'bossShake 0.4s ease' : 'none',
            filter: bossHit ? 'brightness(1.6) saturate(1.3)' : 'brightness(1)',
            transition: 'filter 0.15s',
          }}>
            <div style={{
              position: 'absolute', inset: -12,
              borderRadius: '50%',
              background: bossHit
                ? 'radial-gradient(ellipse, rgba(255,50,50,0.5) 0%, transparent 65%)'
                : 'radial-gradient(ellipse, rgba(180,120,0,0.35) 0%, transparent 65%)',
              filter: 'blur(12px)',
              pointerEvents: 'none',
              transition: 'background 0.2s',
            }}/>

            <svg
              viewBox="0 0 140 190"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none' }}
            >
              <path
                d="M10,50 Q10,10 70,8 Q130,10 130,50 L130,155 Q130,182 70,182 Q10,182 10,155 Z"
                fill="none"
                stroke={bossHit ? '#ff6666' : '#c8922a'}
                strokeWidth="3"
                filter="url(#glow)"
              />
              <path
                d="M16,52 Q16,18 70,16 Q124,18 124,52 L124,152 Q124,174 70,174 Q16,174 16,152 Z"
                fill="none"
                stroke={bossHit ? '#ff9999' : '#e8c060'}
                strokeWidth="1.5" opacity="0.6"
              />
              <path
                d="M30,48 Q30,24 70,22 Q110,24 110,48"
                fill="none" stroke="#f0d070" strokeWidth="1" opacity="0.4"
              />
              <circle cx="16"  cy="80"  r="3" fill="#c8922a" opacity="0.7"/>
              <circle cx="124" cy="80"  r="3" fill="#c8922a" opacity="0.7"/>
              <circle cx="16"  cy="130" r="3" fill="#c8922a" opacity="0.7"/>
              <circle cx="124" cy="130" r="3" fill="#c8922a" opacity="0.7"/>
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
            </svg>

            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: 14,
              background: 'linear-gradient(160deg, #2a1804 0%, #0e0802 100%)',
              clipPath: 'ellipse(90% 95% at 50% 50%)',
              zIndex: 0,
            }}/>

            <div style={{
              position: 'absolute',
              top: 18, left: '50%',
              transform: 'translateX(-50%)',
              width: 100, height: 110,
              borderRadius: '50% 50% 45% 45%',
              overflow: 'hidden',
              zIndex: 1,
              border: `2px solid ${bossHit ? '#ff8888' : '#a07028'}`,
              boxShadow: bossHit
                ? '0 0 20px rgba(255,80,80,0.7)'
                : '0 0 16px rgba(160,100,0,0.5), inset 0 2px 0 rgba(255,220,100,0.2)',
              background: 'radial-gradient(ellipse at 50% 30%, #2a1404, #0a0502)',
              padding: 0,
            }}>
              <img
                src="/images/boss.png"
                alt="boss"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              />
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: '35%',
                background: 'linear-gradient(180deg, rgba(255,220,100,0.1) 0%, transparent 100%)',
                borderRadius: '50% 50% 0 0',
                pointerEvents: 'none',
              }}/>
            </div>

            <div style={{
              position: 'absolute', bottom: 28, left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap', zIndex: 4,
              background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.8) 20%, rgba(0,0,0,0.8) 80%, transparent)',
              padding: '3px 14px',
            }}>
              <span style={{
                color: '#f0d070', fontSize: 12, fontWeight: 700,
                letterSpacing: 2, fontFamily: 'serif',
                textShadow: '0 0 10px rgba(240,200,80,0.6), 0 1px 3px rgba(0,0,0,0.9)',
              }}>
                暗影领主
              </span>
            </div>

            {/* 左下角：攻击力 */}
            <div style={{ position: 'absolute', bottom: -6, left: -8, width: 44, height: 44, zIndex: 5 }}>
              <div style={{
                position: 'absolute', inset: -2, borderRadius: '50%',
                background: 'conic-gradient(#ffd700 0%, #8b6000 50%, #ffd700 100%)',
                filter: 'blur(3px)', opacity: 0.8,
              }}/>
              <div style={{
                position: 'relative', width: '100%', height: '100%',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 28%, #f0c030, #7a5000)',
                border: '2px solid #ffd700',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 18, color: '#fff',
                boxShadow: '0 0 14px rgba(220,170,0,0.8), 0 3px 8px rgba(0,0,0,0.8)',
                fontFamily: '"Cinzel", monospace',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              }}>5</div>
            </div>

            {/* 右下角：HP */}
            <div style={{ position: 'absolute', bottom: -6, right: -8, width: 44, height: 44, zIndex: 5 }}>
              <div style={{
                position: 'absolute', inset: -2, borderRadius: '50%',
                background: 'conic-gradient(#ff4444 0%, #660000 50%, #ff4444 100%)',
                filter: 'blur(3px)', opacity: 0.8,
              }}/>
              <div style={{
                position: 'relative', width: '100%', height: '100%',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 28%, #cc2222, #550000)',
                border: '2px solid #ff6666',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900,
                fontSize: bossHp > 999 ? 10 : 16,
                color: '#fff',
                boxShadow: '0 0 14px rgba(200,30,30,0.8), 0 3px 8px rgba(0,0,0,0.8)',
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

          </div>
        </div>

      </div>
    </>
  );
}