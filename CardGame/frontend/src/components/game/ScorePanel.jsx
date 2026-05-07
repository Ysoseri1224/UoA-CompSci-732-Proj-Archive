// src/components/game/ScorePanel.jsx
import HandTypeDisplay from './HandTypeDisplay.jsx';

export default function ScorePanel({
  evaluation,
  totalScore,
  round,
  selectedCount,
  onPlay,
  onDiscard,
  discards,
  maxDiscards,
  canPlay,
  canDiscard,
}) {
  return (
    <div className="flex flex-col w-52 flex-shrink-0
                    bg-gradient-to-b from-stone-950 to-stone-900
                    border-l border-yellow-900/40">

      {/* 回合 */}
      <div className="px-4 py-3 border-b border-yellow-900/30">
        <div className="text-yellow-900 text-xs tracking-widest font-mono mb-1">
          ROUND
        </div>
        <div className="text-yellow-400 text-3xl font-black">
          {round}
        </div>
      </div>

      {/* 累计积分 */}
      <div className="px-4 py-3 border-b border-yellow-900/30">
        <div className="text-yellow-900 text-xs tracking-widest font-mono mb-1">
          总积分
        </div>
        <div className="text-yellow-300 text-xl font-black font-mono">
          {totalScore.toLocaleString()}
        </div>
      </div>

      {/* 当前牌型评估 */}
      <div className="px-4 py-3 border-b border-yellow-900/30 flex flex-col gap-2">
        <div className="text-yellow-900 text-xs tracking-widest font-mono">
          已选 {selectedCount} / 5
        </div>
        <HandTypeDisplay evaluation={evaluation} />
      </div>

      {/* 弃牌次数指示器 */}
      <div className="px-4 py-3 border-b border-yellow-900/30">
        <div className="text-yellow-900 text-xs tracking-widest font-mono mb-2">
          弃牌次数
        </div>
        <div className="flex gap-2 mb-1">
          {Array.from({ length: maxDiscards }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full transition-all duration-300
                ${i < discards
                  ? 'bg-yellow-500 shadow-sm shadow-yellow-500/50'
                  : 'bg-stone-700'
                }`}
            />
          ))}
        </div>
        <div className={`text-xs ${discards > 0 ? 'text-yellow-700' : 'text-stone-600'}`}>
          {discards > 0 ? `剩余 ${discards} 次` : '本回合已用完'}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="px-4 py-4 flex flex-col gap-3 mt-auto">

        {/* 出牌攻击 */}
        <button
          onClick={onPlay}
          disabled={!canPlay}
          className={`
            w-full py-3 rounded-lg font-black text-sm tracking-widest
            transition-all duration-150
            ${canPlay
              ? 'bg-gradient-to-b from-yellow-600 to-yellow-800 text-yellow-100 hover:from-yellow-500 hover:to-yellow-700 shadow-md shadow-yellow-900/50 active:scale-95'
              : 'bg-stone-800 text-stone-600 cursor-not-allowed'
            }
          `}
        >
          出牌攻击
        </button>

        {/* 弃牌补充 */}
        <button
          onClick={onDiscard}
          disabled={!canDiscard}
          className={`
            w-full py-2.5 rounded-lg text-sm tracking-widest
            border transition-all duration-150
            flex items-center justify-center gap-2
            ${canDiscard
              ? 'border-yellow-800 text-yellow-600 hover:border-yellow-600 hover:text-yellow-400 active:scale-95'
              : 'border-stone-800 text-stone-700 cursor-not-allowed'
            }
          `}
        >
          弃牌补充
          <span className={`
            text-xs font-mono px-1.5 py-0.5 rounded
            ${canDiscard ? 'bg-yellow-900/50 text-yellow-500' : 'bg-stone-800 text-stone-600'}
          `}>
            {discards}/{maxDiscards}
          </span>
        </button>

      </div>

    </div>
  );
}
