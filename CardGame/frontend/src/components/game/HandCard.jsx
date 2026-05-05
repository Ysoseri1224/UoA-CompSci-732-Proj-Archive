// src/components/game/HandCard.jsx
import { useState } from 'react';

const COLOR_THEME = {
  red: {
    border:    '#ef4444',
    borderSel: '#fca5a5',
    glow:      'rgba(239,68,68,0.7)',
    costBg:    'rgba(180,30,30,0.95)',
  },
  blue: {
    border:    '#3b82f6',
    borderSel: '#93c5fd',
    glow:      'rgba(59,130,246,0.7)',
    costBg:    'rgba(30,60,180,0.95)',
  },
  green: {
    border:    '#22c55e',
    borderSel: '#86efac',
    glow:      'rgba(34,197,94,0.7)',
    costBg:    'rgba(20,120,50,0.95)',
  },
};

export default function HandCard({ card, isSelected, selectionIndex, onClick }) {
  const [hovered, setHovered] = useState(false);
  const theme = COLOR_THEME[card.color] ?? COLOR_THEME.blue;

  return (
    <>
      {/* 手牌本体 */}
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position:   'relative',
          width:      96,
          height:     140,
          borderRadius: 12,
          border:     `2px solid ${
            isSelected ? theme.borderSel
            : hovered   ? theme.border
            : 'rgba(80,60,20,0.5)'
          }`,
          cursor:     'pointer',
          flexShrink: 0,
          transform:  isSelected
            ? 'translateY(-28px) scale(1.05)'
            : hovered
              ? 'translateY(-10px) scale(1.02)'
              : 'translateY(0) scale(1)',
          transition: 'all 0.18s cubic-bezier(.34,1.56,.64,1)',
          boxShadow:  isSelected
            ? `0 12px 32px rgba(0,0,0,0.7), 0 0 20px ${theme.glow}`
            : hovered
              ? `0 8px 20px rgba(0,0,0,0.5), 0 0 12px ${theme.glow}`
              : '0 4px 12px rgba(0,0,0,0.5)',
          overflow:   'visible',
          userSelect: 'none',
        }}
      >
        {/* 图片容器（overflow hidden 单独套一层） */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <img
            src={card.image}
            alt={card.name}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
              transition: 'transform 0.3s ease',
              transform: hovered || isSelected ? 'scale(1.06)' : 'scale(1)',
            }}
          />
        </div>

        {/* 悬浮大图预览 —— 跟着牌的位置 */}
        {hovered && !isSelected && (
          <div style={{
            position:      'absolute',
            bottom:        'calc(100% + 12px)',
            left:          '50%',
            transform:     'translateX(-50%)',
            zIndex:        100,
            pointerEvents: 'none',
            animation:     'popIn 0.15s ease-out forwards',
          }}>
            <div style={{
              width: 180, height: 260,
              borderRadius: 16,
              border: `2px solid ${theme.border}`,
              overflow: 'hidden',
              boxShadow: `0 0 40px ${theme.glow}, 0 20px 60px rgba(0,0,0,0.8)`,
            }}>
              <img
                src={card.image}
                alt={card.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        )}

        {/* 选中序号 */}
        {isSelected && (
          <div style={{
            position:  'absolute', top: 6, right: 6, zIndex: 3,
            width: 20, height: 20, borderRadius: '50%',
            background: theme.costBg,
            border:     `1px solid ${theme.borderSel}`,
            display:   'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 900, color: '#fff',
            boxShadow: `0 0 8px ${theme.glow}`,
          }}>
            {selectionIndex + 1}
          </div>
        )}

        {/* 选中时底部发光条 */}
        {isSelected && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 3, borderRadius: '0 0 10px 10px',
            background: `linear-gradient(90deg, transparent, ${theme.borderSel}, transparent)`,
          }} />
        )}

      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: translateX(-50%) scale(0.85); }
          to   { opacity: 1; transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </>
  );
}