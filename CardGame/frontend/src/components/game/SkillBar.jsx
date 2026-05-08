// src/components/game/SkillBar.jsx
import { useState } from 'react';

const COLORS = [
  { value: 'red',   label: '红',  class: 'bg-red-500',   text: 'text-red-300'   },
  { value: 'blue',  label: '蓝',  class: 'bg-blue-500',  text: 'text-blue-300'  },
  { value: 'green', label: '绿',  class: 'bg-green-500', text: 'text-green-300' },
];

const COSTS = [1,2,3,4,5,6,7,8,9,10,11,12,13];
function costLabel(c) {
  return { 1:'A', 11:'J', 12:'Q', 13:'K' }[c] ?? String(c);
}

export default function SkillBar({
  hand,
  skillCooldowns,
  shieldActive,
  skillChangeColor,
  skillChangeCost,
  skillActivateShield,
}) {
  // 当前打开的技能面板: null | 'color' | 'cost' | 'shield'
  const [panel, setPanel] = useState(null);
  // 技能1/2 第一步：先选牌
  const [pickingCard, setPickingCard] = useState(null); // 'color' | 'cost'
  const [targetCard,  setTargetCard]  = useState(null); // 选中的 card.id

  function closePanel() {
    setPanel(null);
    setPickingCard(null);
    setTargetCard(null);
  }

  // ── 技能1流程 ─────────────────────────────
  function openColorSkill() {
    if (skillCooldowns.changeColor) return;
    setPickingCard('color');
    setTargetCard(null);
    setPanel('color');
  }
  function selectCardForColor(cardId) {
    setTargetCard(cardId);
  }
  function applyColor(newColor) {
    if (!targetCard) return;
    skillChangeColor(targetCard, newColor);
    closePanel();
  }

  // ── 技能2流程 ─────────────────────────────
  function openCostSkill() {
    if (skillCooldowns.changeCost) return;
    setPickingCard('cost');
    setTargetCard(null);
    setPanel('cost');
  }
  function selectCardForCost(cardId) {
    setTargetCard(cardId);
  }
  function applyCost(newCost) {
    if (!targetCard) return;
    skillChangeCost(targetCard, newCost);
    closePanel();
  }

  // ── 技能3流程 ─────────────────────────────
  function openShieldSkill() {
    if (skillCooldowns.shield) return;
    skillActivateShield();
    setPanel('shield');
    setTimeout(() => setPanel(null), 1500); // 动画后自动关闭
  }

  return (
    <div className="relative flex flex-col items-center gap-3 px-2 py-4 flex-shrink-0
                    bg-gradient-to-r from-stone-950 to-stone-900/60
                    border-r border-yellow-900/40"
         style={{ width: 68 }}
    >

      {/* ── 技能1：变色 ── */}
      <SkillButton
        icon="🎨"
        label="变色"
        used={skillCooldowns.changeColor}
        active={panel === 'color'}
        onClick={openColorSkill}
      />

      {/* ── 技能2：变费 ── */}
      <SkillButton
        icon="🔢"
        label="变费"
        used={skillCooldowns.changeCost}
        active={panel === 'cost'}
        onClick={openCostSkill}
      />

      {/* ── 技能3：护盾 ── */}
      <SkillButton
        icon="🛡️"
        label="护盾"
        used={skillCooldowns.shield}
        active={panel === 'shield'}
        onClick={openShieldSkill}
        activated={shieldActive}
      />

      {/* ── 浮层面板 ── */}
      {panel === 'color' && (
        <SkillPanel title="变色技能" onClose={closePanel}>
          {/* Step1: 选牌 */}
          <div className="text-stone-400 text-xs mb-2">
            {!targetCard ? '① 选择要变色的手牌' : '② 选择目标颜色'}
          </div>

          {/* 手牌迷你列表 */}
          {!targetCard && (
            <div className="flex flex-col gap-1">
              {hand.map(c => (
                <MiniCardRow
                  key={c.id}
                  card={c}
                  onClick={() => selectCardForColor(c.id)}
                />
              ))}
            </div>
          )}

          {/* 颜色选择 */}
          {targetCard && (
            <div className="flex gap-2 mt-1">
              {COLORS.filter(col =>
                col.value !== hand.find(c => c.id === targetCard)?.color
              ).map(col => (
                <button
                  key={col.value}
                  onClick={() => applyColor(col.value)}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs
                              ${col.class} text-white
                              hover:opacity-80 active:scale-95 transition-all`}
                >
                  {col.label}
                </button>
              ))}
            </div>
          )}
        </SkillPanel>
      )}

      {panel === 'cost' && (
        <SkillPanel title="变费技能" onClose={closePanel}>
          <div className="text-stone-400 text-xs mb-2">
            {!targetCard ? '① 选择要变费的手牌' : '② 选择新费用'}
          </div>

          {!targetCard && (
            <div className="flex flex-col gap-1">
              {hand.map(c => (
                <MiniCardRow
                  key={c.id}
                  card={c}
                  onClick={() => selectCardForCost(c.id)}
                />
              ))}
            </div>
          )}

          {targetCard && (
            <div className="grid grid-cols-5 gap-1 mt-1">
              {COSTS.map(cost => (
                <button
                  key={cost}
                  onClick={() => applyCost(cost)}
                  className={`py-1 rounded text-xs font-black
                              transition-all active:scale-95
                              ${cost === hand.find(c => c.id === targetCard)?.cost
                                ? 'bg-stone-700 text-stone-500 cursor-not-allowed'
                                : 'bg-yellow-900/60 text-yellow-300 hover:bg-yellow-800/60'
                              }`}
                  disabled={cost === hand.find(c => c.id === targetCard)?.cost}
                >
                  {costLabel(cost)}
                </button>
              ))}
            </div>
          )}
        </SkillPanel>
      )}

      {panel === 'shield' && (
        <SkillPanel title="" onClose={closePanel} autoClose>
          <div className="text-center py-2">
            <div className="text-4xl mb-1">🛡️</div>
            <div className="text-blue-300 font-bold text-sm">护盾已激活！</div>
            <div className="text-stone-400 text-xs mt-1">免疫下一次伤害</div>
          </div>
        </SkillPanel>
      )}

    </div>
  );
}

// ── 子组件：技能按钮 ──────────────────────────────────────
function SkillButton({ icon, label, used, active, onClick, activated }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative w-12 h-12 rounded-full flex flex-col items-center
        justify-center border-2 transition-all duration-150
        ${used && !activated
          ? 'border-stone-700 bg-stone-900 opacity-40 cursor-not-allowed'
          : activated
            ? 'border-blue-400 bg-blue-900/40 shadow-lg shadow-blue-500/40 animate-pulse'
            : active
              ? 'border-yellow-400 bg-yellow-900/40 shadow-md shadow-yellow-500/30 scale-110'
              : 'border-yellow-800/60 bg-stone-900 hover:border-yellow-600 hover:scale-105'
        }
      `}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-yellow-700 text-xs leading-none mt-0.5">{label}</span>
      {used && !activated && (
        <div className="absolute inset-0 rounded-full bg-black/50
                        flex items-center justify-center">
          <span className="text-stone-500 text-xs">用过</span>
        </div>
      )}
    </button>
  );
}

// ── 子组件：浮层面板 ──────────────────────────────────────
function SkillPanel({ title, children, onClose }) {
  return (
    <div className="absolute left-16 top-2 z-50 w-52
                    bg-stone-900 border border-yellow-800/50
                    rounded-xl shadow-2xl shadow-black/70
                    p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        {title && (
          <span className="text-yellow-400 text-xs font-bold tracking-wide">
            {title}
          </span>
        )}
        <button
          onClick={onClose}
          className="ml-auto text-stone-600 hover:text-stone-300
                     text-xs px-1 transition-colors"
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}

// ── 子组件：手牌迷你行 ────────────────────────────────────
const COLOR_DOT = {
  red:   'bg-red-500',
  blue:  'bg-blue-500',
  green: 'bg-green-500',
};



function MiniCardRow({ card, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg
                 bg-stone-800 hover:bg-stone-700
                 border border-stone-700 hover:border-yellow-700
                 transition-all active:scale-95 text-left w-full"
    >
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLOR_DOT[card.color]}`} />
      <span className="text-yellow-500 font-black text-xs w-5 text-center">
        {costLabel(card.cost)}
      </span>
      <span className="text-stone-300 text-xs truncate flex-1">
        {card.name}
      </span>
    </button>
  );
}
