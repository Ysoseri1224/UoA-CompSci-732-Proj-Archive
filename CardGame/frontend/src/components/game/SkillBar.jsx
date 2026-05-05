// src/components/game/SkillBar.jsx
import { useState } from 'react';

const COLORS = [
  { value: 'red',   label: 'Red',   dot: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  { value: 'blue',  label: 'Blue',  dot: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  { value: 'green', label: 'Green', dot: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
];

const COSTS = [1,2,3,4,5,6,7,8,9,10,11,12,13];
function costLabel(c) {
  return { 1:'A', 11:'J', 12:'Q', 13:'K' }[c] ?? String(c);
}

export default function SkillBar({
  hand,
  skillCooldowns,
  skillCharges,
  skillChangeColor,
  skillChangeCost,
  skillActivateShield,
}) {
  const [panel,      setPanel]      = useState(null);
  const [targetCard, setTargetCard] = useState(null);
  const noCharges = skillCharges <= 0;

  function closePanel() { setPanel(null); setTargetCard(null); }

  function openColorSkill() {
    if (noCharges) return;
    setPanel(panel === 'color' ? null : 'color');
    setTargetCard(null);
  }
  function applyColor(newColor) {
    if (!targetCard) return;
    skillChangeColor(targetCard, newColor);
    closePanel();
  }

  function openCostSkill() {
    if (noCharges) return;
    setPanel(panel === 'cost' ? null : 'cost');
    setTargetCard(null);
  }
  function applyCost(newCost) {
    if (!targetCard) return;
    skillChangeCost(targetCard, newCost);
    closePanel();
  }

  function openShieldSkill() {
    if (noCharges || skillCooldowns.shield) return;
    skillActivateShield();
    setPanel('shield');
    setTimeout(() => setPanel(null), 1500);
  }

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0,
      width: 72,
      flexShrink: 0,
      background: 'linear-gradient(180deg, #0a0804 0%, #0e0c06 100%)',
      borderRight: '1px solid rgba(200,160,70,0.15)',
      paddingTop: 16,
      paddingBottom: 16,
    }}>

      {/* ── 充能值 ── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 6,
        marginBottom: 16,
        padding: '10px 8px',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: 10,
        border: '1px solid rgba(200,160,70,0.15)',
        width: 54,
      }}>
        {/* 充能数字 */}
        <div style={{
          fontSize: 22, fontWeight: 900,
          fontFamily: '"Cinzel", monospace',
          color: skillCharges > 0 ? '#ffd700' : '#2a2010',
          textShadow: skillCharges > 0
            ? '0 0 12px rgba(255,215,0,0.7)'
            : 'none',
          lineHeight: 1,
          transition: 'all 0.3s',
        }}>
          {skillCharges}
        </div>

        {/* 充能点 */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 9, height: 9, borderRadius: '50%',
              background: i < skillCharges
                ? 'radial-gradient(circle at 35% 30%, #ffd700, #a07000)'
                : '#1a1208',
              border: `1px solid ${i < skillCharges ? '#ffd700' : '#2a2010'}`,
              boxShadow: i < skillCharges
                ? '0 0 6px rgba(255,215,0,0.6)'
                : 'none',
              transition: 'all 0.3s',
            }}/>
          ))}
        </div>

        <div style={{
          fontSize: 7, color: '#5a4a28',
          fontFamily: 'monospace', letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}>
          Charges
        </div>
      </div>

      {/* ── 分割线 ── */}
      <div style={{
        width: 40, height: 1, marginBottom: 14,
        background: 'linear-gradient(90deg, transparent, rgba(200,160,70,0.25), transparent)',
      }}/>

      {/* ── 三个技能按钮 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* 变色 */}
        <SkillBtn
          icon="🎨" label="Color"
          disabled={noCharges}
          active={panel === 'color'}
          onClick={openColorSkill}
        />

        {/* 变费 */}
        <SkillBtn
          icon="✦" label="Rank"
          disabled={noCharges}
          active={panel === 'cost'}
          onClick={openCostSkill}
          iconStyle={{ fontSize: 20, color: '#e8c86a' }}
        />

        {/* 护盾 */}
        <SkillBtn
          icon="🛡️" label="Shield"
          disabled={noCharges || skillCooldowns.shield}
          active={panel === 'shield' || skillCooldowns.shield}
          activated={skillCooldowns.shield}
          onClick={openShieldSkill}
        />

      </div>

      {/* ── 浮层面板 ── */}
      {panel === 'color' && (
        <SkillPanel title="✦ Change Color" onClose={closePanel}>
          <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 10 }}>
            {!targetCard ? 'Select a card to transform' : 'Choose target color'}
          </div>
          {!targetCard ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {hand.map(c => (
                <MiniCardRow key={c.id} card={c} onClick={() => setTargetCard(c.id)} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {COLORS.filter(col =>
                col.value !== hand.find(c => c.id === targetCard)?.color
              ).map(col => (
                <button
                  key={col.value}
                  onClick={() => applyColor(col.value)}
                  style={{
                    padding: '8px 12px', borderRadius: 8,
                    border: `1px solid ${col.dot}`,
                    background: col.bg,
                    color: col.dot,
                    fontWeight: 700, fontSize: 13,
                    cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: col.dot,
                    boxShadow: `0 0 6px ${col.dot}`,
                  }}/>
                  {col.label}
                </button>
              ))}
            </div>
          )}
        </SkillPanel>
      )}

      {panel === 'cost' && (
        <SkillPanel title="✦ Change Rank" onClose={closePanel}>
          <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 10 }}>
            {!targetCard ? 'Select a card to transform' : 'Choose new rank'}
          </div>
          {!targetCard ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {hand.map(c => (
                <MiniCardRow key={c.id} card={c} onClick={() => setTargetCard(c.id)} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5 }}>
              {COSTS.map(cost => {
                const isCurrent = cost === hand.find(c => c.id === targetCard)?.cost;
                return (
                  <button key={cost}
                    onClick={() => !isCurrent && applyCost(cost)}
                    style={{
                      padding: '6px 2px', borderRadius: 6,
                      border: `1px solid ${isCurrent ? '#2a2010' : '#4a3a18'}`,
                      background: isCurrent ? '#0e0c06' : 'rgba(200,160,64,0.1)',
                      color: isCurrent ? '#2a2010' : '#e8c86a',
                      fontWeight: 700, fontSize: 12,
                      cursor: isCurrent ? 'not-allowed' : 'pointer',
                      fontFamily: '"Cinzel", monospace',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(200,160,64,0.25)'; }}
                    onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(200,160,64,0.1)'; }}
                  >
                    {costLabel(cost)}
                  </button>
                );
              })}
            </div>
          )}
        </SkillPanel>
      )}

      {panel === 'shield' && (
        <SkillPanel title="" onClose={closePanel}>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
            <div style={{
              color: '#93c5fd', fontWeight: 800,
              fontSize: 14, letterSpacing: 1,
            }}>
              Shield Active!
            </div>
            <div style={{ color: '#4b5563', fontSize: 11, marginTop: 6 }}>
              Next attack absorbed
            </div>
          </div>
        </SkillPanel>
      )}

    </div>
  );
}

// ── 技能按钮 ──────────────────────────────────────────────
function SkillBtn({ icon, label, disabled, active, activated, onClick, iconStyle }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: 54, height: 54,
        borderRadius: 12,
        border: `1px solid ${
          activated ? 'rgba(96,165,250,0.7)'
          : active   ? 'rgba(200,160,70,0.7)'
          : disabled ? 'rgba(42,32,16,0.5)'
          : 'rgba(90,74,40,0.5)'
        }`,
        background: activated
          ? 'linear-gradient(160deg, #1e3a5f, #0c1a2e)'
          : active
            ? 'linear-gradient(160deg, #2a1e08, #1a1004)'
            : 'linear-gradient(160deg, #141008, #0a0806)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transition: 'all 0.2s',
        boxShadow: activated
          ? '0 0 14px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
          : active
            ? '0 0 12px rgba(200,160,70,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
            : 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = activated ? 'rgba(96,165,250,0.9)' : 'rgba(200,160,70,0.6)'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.borderColor = activated ? 'rgba(96,165,250,0.7)' : active ? 'rgba(200,160,70,0.7)' : 'rgba(90,74,40,0.5)'; }}
    >
      <span style={{ fontSize: 20, lineHeight: 1, ...iconStyle }}>{icon}</span>
      <span style={{
        fontSize: 8,
        color: disabled ? '#2a2010'
          : activated ? '#93c5fd'
          : active    ? '#e8c86a'
          : '#5a4a28',
        letterSpacing: 0.8,
        fontFamily: 'monospace',
        textTransform: 'uppercase',
      }}>{label}</span>
    </button>
  );
}

// ── 浮层面板 ──────────────────────────────────────────────
function SkillPanel({ title, children, onClose }) {
  return (
    <div style={{
      position: 'absolute', left: 78, top: 0,
      zIndex: 50, width: 210,
      background: 'linear-gradient(160deg, #0e0c06, #0a0804)',
      border: '1px solid rgba(200,160,70,0.3)',
      borderRadius: 12,
      padding: '12px 14px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: title ? 10 : 0,
      }}>
        {title && (
          <span style={{
            color: '#c8a040', fontSize: 12,
            fontWeight: 700, letterSpacing: 1,
            fontFamily: 'monospace',
          }}>{title}</span>
        )}
        <button onClick={onClose} style={{
          marginLeft: 'auto', background: 'none', border: 'none',
          color: '#4a3a18', cursor: 'pointer',
          fontSize: 16, lineHeight: 1, padding: '0 2px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#8a7848'}
        onMouseLeave={e => e.currentTarget.style.color = '#4a3a18'}
        >✕</button>
      </div>
      {children}
    </div>
  );
}

// ── 手牌迷你行 ────────────────────────────────────────────
const COLOR_DOT = { red: '#ef4444', blue: '#3b82f6', green: '#22c55e' };

function MiniCardRow({ card, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 8px', borderRadius: 8, width: '100%',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(90,74,40,0.3)',
      cursor: 'pointer', textAlign: 'left',
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = 'rgba(200,160,70,0.08)';
      e.currentTarget.style.borderColor = 'rgba(200,160,70,0.4)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
      e.currentTarget.style.borderColor = 'rgba(90,74,40,0.3)';
    }}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: COLOR_DOT[card.color] ?? '#888',
        boxShadow: `0 0 5px ${COLOR_DOT[card.color] ?? '#888'}`,
      }}/>
      <span style={{
        color: '#e8c86a', fontWeight: 800,
        fontSize: 12, width: 18, textAlign: 'center',
        fontFamily: '"Cinzel", monospace',
      }}>
        {({ 1:'A', 11:'J', 12:'Q', 13:'K' })[card.cost] ?? card.cost}
      </span>
      <span style={{
        color: '#6b7280', fontSize: 11,
        overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', flex: 1,
      }}>
        {card.name}
      </span>
    </button>
  );
}