// src/components/game/HandArea.jsx
import HandCard from './HandCard';
import PlayerHUD from './PlayerHUD';

export default function HandArea({
  hand, selected, onToggle, deckCount,
  playerHp, playerMaxHp, shieldActive,
}) {
  return (
    <div style={{
      position:   'relative',
      height:     175,
      display:    'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 10,
      padding: '0 80px 12px 200px',
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

      {/* ── 左侧：玩家 HUD ── */}
      <div style={{
        position: 'absolute',
        left: 12, bottom: 16,
        zIndex: 10,
      }}>
        {/* 护盾光环 */}
        {shieldActive && (
          <>
            <div style={{
              position: 'absolute', inset: -14, borderRadius: 20,
              border: '2px solid rgba(96,165,250,0.5)',
              animation: 'shieldRing 1.5s ease-out infinite',
              zIndex: 11, pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', inset: -8, borderRadius: 18,
              border: '2px solid rgba(96,165,250,0.8)',
              animation: 'shieldPulse 2s ease-in-out infinite',
              zIndex: 11, pointerEvents: 'none',
            }} />
     <div style={{
  position: 'absolute', top: -4, right: -4,
  width: 24, height: 24,
}}>
  <img
    src="/images/skill-shield.png"
    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    alt=""
  />
</div>
          </>
        )}
        <PlayerHUD
          hp={playerHp}
          maxHp={playerMaxHp}
          avatar="/images/player.png"
        />
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