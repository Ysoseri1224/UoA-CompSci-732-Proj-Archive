// src/components/game/HandArea.jsx
import HandCard from './HandCard';

export default function HandArea({ hand, selected, onToggle, deckCount }) {
  return (
    <div className="relative flex items-end justify-center gap-3 px-6 pb-4 pt-2
                    bg-gradient-to-t from-black/80 to-transparent
                    border-t border-yellow-900/40 flex-shrink-0"
         style={{ height: 160 }}
    >
      {/* 手牌列表 */}
      {hand.map((card) => (
        <HandCard
          key={card.id}
          card={card}
          isSelected={selected.includes(card.id)}
          selectionIndex={selected.indexOf(card.id)}
          onClick={() => onToggle(card.id)}
        />
      ))}

      {/* 牌库剩余（右下角） */}
      <div className="absolute right-5 bottom-4 flex flex-col items-center gap-0.5">
        {/* 叠牌视觉 */}
        <div className="relative w-10 h-14">
          <div className="absolute inset-0 translate-x-1 translate-y-1
                          rounded-lg border border-yellow-800/50 bg-yellow-950/60" />
          <div className="absolute inset-0 translate-x-0.5 translate-y-0.5
                          rounded-lg border border-yellow-800/50 bg-yellow-950/70" />
          <div className="absolute inset-0 rounded-lg border border-yellow-700/60
                          bg-gradient-to-b from-yellow-950 to-stone-950
                          flex items-center justify-center">
            <span className="text-yellow-500 font-black text-sm">{deckCount}</span>
          </div>
        </div>
        <span className="text-yellow-800 text-xs tracking-widest">牌库</span>
      </div>
    </div>
  );
}