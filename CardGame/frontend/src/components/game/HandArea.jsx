// src/components/game/HandArea.jsx
import HandCard from './HandCard';

export default function HandArea({
  hand, selected, onToggle, deckCount,
  playerHp, playerMaxHp, shieldActive,
}) {
  const playerHpPct = Math.max(0, (playerHp / playerMaxHp) * 100);

  return (
    <div style={{
      position:   'relative',
      height:     175,
      display:    'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 10,
      padding: '0 80px 12px 16px',
      background: `
      linear-gradient(0deg,
        rgba(0,0,0,0.7) 0%,
        rgba(0,0,0,0.3) 40%,
        transparent 100%
      ),
      url('/images/handarea.png') center/cover no-repeat
    `,
      borderTop:  '1px solid rgba(120,80,20,0.3)',
      flexShrink: 0,
      overflow:   'visible',
    }}>

      {/* 桌面顶部线 */}
      <div style={{
        position: 'absolute', top: 0, left: '5%', right: '5%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(200,160,70,0.2), transparent)',
      }} />

      {/* ── 左侧玩家状态区 ── */}
      <div style={{
        position:   'absolute',
        left: 12, bottom: 12,
        display:    'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        width: 100,
        zIndex: 10,
      }}>
        {/* 头像 */}
        <div style={{ position: 'relative' }}>
          {shieldActive && (
            <>
              <div style={{
                position: 'absolute', inset: -10, borderRadius: '50%',
                border: '2px solid rgba(96,165,250,0.5)',
                animation: 'shieldRing 1.5s ease-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: -5, borderRadius: '50%',
                border: '2px solid rgba(96,165,250,0.8)',
                animation: 'shieldPulse 2s ease-in-out infinite',
              }} />
            </>
          )}
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: `2px solid ${shieldActive ? '#60a5fa' : '#166534'}`,
            background: shieldActive
              ? 'radial-gradient(circle at 40% 30%, #1e3a5f, #0c1a2e)'
              : 'radial-gradient(circle at 40% 30%, #052e16, #021409)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
            boxShadow: shieldActive
              ? '0 0 16px rgba(59,130,246,0.5)'
              : '0 4px 12px rgba(0,0,0,0.6)',
            transition: 'all 0.3s',
            position: 'relative',
          }}>
            🛡️
            {shieldActive && (
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 18, height: 18, borderRadius: '50%',
                background: '#2563eb', border: '1px solid #93c5fd',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 9,
                boxShadow: '0 0 8px rgba(59,130,246,0.7)',
              }}>🛡</div>
            )}
          </div>
        </div>

        {/* HP 数字 */}
        <div style={{
          fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
          color: playerHpPct > 50 ? '#4ade80' : playerHpPct > 25 ? '#eab308' : '#ef4444',
        }}>
          {playerHp} / {playerMaxHp}
        </div>

        {/* HP 条 */}
        <div style={{
          width: '100%', height: 6, borderRadius: 3,
          background: 'rgba(5,20,5,0.9)',
          border: '1px solid rgba(20,80,20,0.5)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${playerHpPct}%`,
            background: playerHpPct > 50
              ? 'linear-gradient(90deg,#166534,#22c55e)'
              : playerHpPct > 25
                ? 'linear-gradient(90deg,#713f12,#eab308)'
                : 'linear-gradient(90deg,#7f1d1d,#ef4444)',
            borderRadius: 3,
            transition: 'width 0.5s ease',
          }} />
        </div>

        {/* HP 格子 */}
        <div style={{ display: 'flex', gap: 2, width: '100%' }}>
          {Array.from({ length: playerMaxHp }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 1,
              background: i < playerHp ? '#22c55e' : '#1c1c1c',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        <div style={{
          fontSize: 9, color: '#374151',
          fontFamily: 'monospace', letterSpacing: 1,
          textAlign: 'center',
        }}>
          承受 {Math.floor(playerHp / 5)} 次
        </div>
      </div>

      {/* ── 手牌 ── */}
      {hand.map((card) => (
        <HandCard
          key={card.id}
          card={card}
          isSelected={selected.includes(card.id)}
          selectionIndex={selected.indexOf(card.id)}
          onClick={() => onToggle(card.id)}
        />
      ))}

      {/* ── 牌库（右下角） ── */}
      <div style={{
        position: 'absolute', right: 16, bottom: 12,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 3,
      }}>
        <div style={{ position: 'relative', width: 44, height: 60 }}>
          {[3, 2, 1].map(i => (
            <div key={i} style={{
              position: 'absolute', inset: 0,
              transform: `translate(${i * 1.5}px, ${i * 1.5}px)`,
              borderRadius: 6,
              border: '1px solid rgba(120,80,20,0.4)',
              background: 'linear-gradient(160deg, #1a1208, #0a0804)',
            }} />
          ))}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: 6,
            border: '1px solid rgba(200,160,70,0.5)',
            background: 'linear-gradient(160deg, #1e1810, #0a0804)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}>
            <span style={{
              color: '#c8a040', fontWeight: 900,
              fontSize: 16, fontFamily: 'monospace',
            }}>
              {deckCount}
            </span>
          </div>
        </div>
        <span style={{
          color: '#5a4a20', fontSize: 9,
          letterSpacing: 2, fontFamily: 'monospace',
        }}>
          DECK
        </span>
      </div>

      <style>{`
        @keyframes shieldPulse {
          0%,100% { box-shadow: 0 0 8px rgba(59,130,246,0.4); }
          50%     { box-shadow: 0 0 16px rgba(59,130,246,0.8); }
        }
        @keyframes shieldRing {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}