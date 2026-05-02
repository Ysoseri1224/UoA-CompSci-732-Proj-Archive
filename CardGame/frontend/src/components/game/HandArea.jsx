// src/components/game/HandArea.jsx
import HandCard from './HandCard';

export default function HandArea({ hand, selected, onToggle, deckCount }) {
  return (
    <div
      style={{
        position:   'relative',
        height:     175,
        display:    'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 10,
        padding: '0 80px 12px',
        background: `
          linear-gradient(0deg,
            rgba(0,0,0,0.95) 0%,
            rgba(10,8,4,0.85) 60%,
            transparent 100%
          )
        `,
        borderTop: '1px solid rgba(120,80,20,0.3)',
        flexShrink: 0,
        overflow: 'visible',
      }}
    >
      {/* 桌面纹理线 */}
      <div style={{
        position: 'absolute', top: 0, left: '5%', right: '5%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(200,160,70,0.2), transparent)',
      }} />

      {hand.map((card) => (
        <HandCard
          key={card.id}
          card={card}
          isSelected={selected.includes(card.id)}
          selectionIndex={selected.indexOf(card.id)}
          onClick={() => onToggle(card.id)}
        />
      ))}

      {/* 牌库 */}
      <div style={{
        position: 'absolute', right: 16, bottom: 12,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 3,
      }}>
        {/* 叠牌效果 */}
        <div style={{ position: 'relative', width: 44, height: 60 }}>
          {[3, 2, 1].map(i => (
            <div key={i} style={{
              position: 'absolute',
              inset: 0,
              transform: `translate(${i * 1.5}px, ${i * 1.5}px)`,
              borderRadius: 6,
              border: '1px solid rgba(120,80,20,0.4)',
              background: `linear-gradient(160deg, #1a1208, #0a0804)`,
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
    </div>
  );
}