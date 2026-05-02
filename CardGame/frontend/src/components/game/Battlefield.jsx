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
  playerHp, playerMaxHp,
  bossHp, bossMaxHp,
  floor, shieldActive, lastScore,
}) {
  const bossHpPct   = Math.max(0, (bossHp   / bossMaxHp)   * 100);
  const playerHpPct = Math.max(0, (playerHp / playerMaxHp) * 100);

  // 飘字
  const [floats,   setFloats]   = useState([]);
  const prevScore               = useRef(null);

  // Boss 受击闪烁
  const [bossHit,  setBossHit]  = useState(false);
  const prevBossHp              = useRef(bossHp);

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
        @keyframes shieldPulse {
          0%,100% { box-shadow: 0 0 12px rgba(59,130,246,0.4), 0 0 24px rgba(59,130,246,0.2); }
          50%     { box-shadow: 0 0 24px rgba(59,130,246,0.8), 0 0 48px rgba(59,130,246,0.4); }
        }
        @keyframes shieldRing {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      <div style={{
        position: 'relative', flex: 1,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        borderLeft:  '1px solid rgba(120,80,20,0.3)',
        borderRight: '1px solid rgba(120,80,20,0.3)',
        background: `
          radial-gradient(ellipse 70% 35% at 50% 5%,  rgba(100,20,20,0.25) 0%, transparent 100%),
          radial-gradient(ellipse 70% 35% at 50% 95%, rgba(20,70,20,0.25)  0%, transparent 100%),
          repeating-linear-gradient(45deg,
            transparent, transparent 50px,
            rgba(255,255,255,0.004) 50px, rgba(255,255,255,0.004) 51px
          ),
          linear-gradient(180deg, #08100a 0%, #0e180a 50%, #08100a 100%)
        `,
      }}>

        {/* 中央分界线 */}
        <div style={{
          position: 'absolute', left: '6%', right: '6%', top: '50%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(200,160,70,0.35) 30%, rgba(200,160,70,0.35) 70%, transparent)',
        }} />

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

        {/* ── 上半 BOSS ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, paddingBottom: 24, paddingTop: 40,
          position: 'relative',
        }}>

          {/* 伤害飘字 */}
          {floats.map(f => <DamageFloat key={f.id} value={f.value} />)}

          {/* Boss 红色氛围光 */}
          <div style={{
            position: 'absolute', top: '10%', left: '50%',
            transform: 'translateX(-50%)',
            width: 160, height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,20,20,0.2) 0%, transparent 70%)',
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }} />

          {/* Boss 头像 */}
          <div style={{
            position: 'relative',
            animation: bossHit ? 'bossShake 0.4s ease' : 'none',
          }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              border: `2px solid ${bossHit ? '#ff4444' : '#7f1d1d'}`,
              background: bossHit
                ? 'radial-gradient(circle at 40% 30%, #991b1b, #450a0a)'
                : 'radial-gradient(circle at 40% 30%, #3a0808, #1c0404)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 42,
              boxShadow: bossHit
                ? '0 0 30px rgba(255,50,50,0.7), inset 0 0 20px rgba(255,0,0,0.2)'
                : '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
              transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
              position: 'relative',
            }}>
              🧙
              <div style={{
                position: 'absolute', bottom: -12,
                left: '50%', transform: 'translateX(-50%)',
                background: '#7f1d1d',
                border: '1px solid #dc2626',
                borderRadius: 10, padding: '1px 10px',
                fontSize: 10, fontWeight: 800,
                color: '#fca5a5', whiteSpace: 'nowrap',
                letterSpacing: 1,
              }}>
                ATK 5
              </div>
            </div>
          </div>

          {/* Boss 血条 */}
          <div style={{ width: 230, marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ color: '#6b7280', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>
                BOSS HP
              </span>
              <span style={{ color: '#f87171', fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>
                {bossHp.toLocaleString()} / {bossMaxHp.toLocaleString()}
              </span>
            </div>
            <div style={{
              height: 14, borderRadius: 7,
              background: 'rgba(20,5,5,0.9)',
              border: '1px solid rgba(100,20,20,0.5)',
              overflow: 'hidden', position: 'relative',
            }}>
              <div style={{
                height: '100%', width: `${bossHpPct}%`,
                background: 'linear-gradient(90deg, #7f1d1d, #dc2626, #ef4444)',
                borderRadius: 7,
                transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
                boxShadow: '0 0 10px rgba(239,68,68,0.5)',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: '45%', borderRadius: '7px 7px 0 0',
                  background: 'rgba(255,255,255,0.12)',
                }} />
              </div>
            </div>
          </div>

        </div>

        {/* ── 下半 玩家 ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, paddingTop: 24,
          position: 'relative',
        }}>

          {/* 绿色氛围光 */}
          <div style={{
            position: 'absolute', bottom: '10%', left: '50%',
            transform: 'translateX(-50%)',
            width: 160, height: 160,
            borderRadius: '50%',
            background: shieldActive
              ? 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(20,80,20,0.2) 0%, transparent 70%)',
            filter: 'blur(20px)',
            transition: 'background 0.5s',
            pointerEvents: 'none',
          }} />

          {/* 玩家头像 */}
          <div style={{ position: 'relative' }}>
            {/* 护盾外环动画 */}
            {shieldActive && (
              <>
                <div style={{
                  position: 'absolute',
                  inset: -18, borderRadius: '50%',
                  border: '2px solid rgba(96,165,250,0.5)',
                  animation: 'shieldRing 1.5s ease-out infinite',
                }} />
                <div style={{
                  position: 'absolute',
                  inset: -10, borderRadius: '50%',
                  border: '2px solid rgba(96,165,250,0.8)',
                  animation: 'shieldPulse 2s ease-in-out infinite',
                }} />
              </>
            )}

            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              border: `2px solid ${shieldActive ? '#60a5fa' : '#166534'}`,
              background: shieldActive
                ? 'radial-gradient(circle at 40% 30%, #1e3a5f, #0c1a2e)'
                : 'radial-gradient(circle at 40% 30%, #052e16, #021409)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 42,
              boxShadow: shieldActive
                ? '0 0 24px rgba(59,130,246,0.5), inset 0 0 12px rgba(59,130,246,0.1)'
                : '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
              transition: 'all 0.3s',
              position: 'relative',
            }}>
              🛡️
              {shieldActive && (
                <div style={{
                  position: 'absolute', bottom: -8, right: -8,
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#2563eb',
                  border: '2px solid #93c5fd',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 12,
                  boxShadow: '0 0 12px rgba(59,130,246,0.7)',
                }}>🛡</div>
              )}
            </div>
          </div>

          {/* 玩家血条 */}
          <div style={{ width: 230 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ color: '#6b7280', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>
                PLAYER HP
              </span>
              <span style={{ color: '#4ade80', fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>
                {playerHp} / {playerMaxHp}
              </span>
            </div>
            <div style={{
              height: 14, borderRadius: 7,
              background: 'rgba(5,20,5,0.9)',
              border: '1px solid rgba(20,80,20,0.5)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${playerHpPct}%`,
                background: playerHpPct > 50
                  ? 'linear-gradient(90deg,#166534,#16a34a,#22c55e)'
                  : playerHpPct > 25
                    ? 'linear-gradient(90deg,#713f12,#a16207,#eab308)'
                    : 'linear-gradient(90deg,#7f1d1d,#b91c1c,#ef4444)',
                borderRadius: 7,
                transition: 'width 0.5s cubic-bezier(.4,0,.2,1)',
                boxShadow: '0 0 8px rgba(34,197,94,0.4)',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: '45%', borderRadius: '7px 7px 0 0',
                  background: 'rgba(255,255,255,0.12)',
                }} />
              </div>
            </div>

            {/* HP 格子 */}
            <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
              {Array.from({ length: playerMaxHp }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 5, borderRadius: 2,
                  background: i < playerHp ? '#22c55e' : '#1c1c1c',
                  boxShadow: i < playerHp ? '0 0 4px rgba(34,197,94,0.5)' : 'none',
                  transition: 'all 0.3s',
                }} />
              ))}
            </div>
            <div style={{
              textAlign: 'center', marginTop: 4,
              fontSize: 10, color: '#374151',
              fontFamily: 'monospace', letterSpacing: 1,
            }}>
              还能承受 {Math.floor(playerHp / 5)} 次攻击
            </div>
          </div>

        </div>

      </div>
    </>
  );
}