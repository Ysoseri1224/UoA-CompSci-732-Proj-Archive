// src/components/game/HandCard.jsx

const COLOR_THEME = {
    red: {
      border:     'border-red-500',
      borderSel:  'border-red-300',
      glow:       'shadow-red-500/40',
      bg:         'from-red-950 to-red-900',
      bgSel:      'from-red-900 to-red-800',
      dot:        'bg-red-500',
      costBg:     'bg-red-700',
      text:       'text-red-200',
    },
    blue: {
      border:     'border-blue-500',
      borderSel:  'border-blue-300',
      glow:       'shadow-blue-500/40',
      bg:         'from-blue-950 to-blue-900',
      bgSel:      'from-blue-900 to-blue-800',
      dot:        'bg-blue-500',
      costBg:     'bg-blue-700',
      text:       'text-blue-200',
    },
    green: {
      border:     'border-green-500',
      borderSel:  'border-green-300',
      glow:       'shadow-green-500/40',
      bg:         'from-green-950 to-green-900',
      bgSel:      'from-green-900 to-green-800',
      dot:        'bg-green-500',
      costBg:     'bg-green-700',
      text:       'text-green-200',
    },
  };
  
  // cost 数字转扑克显示符号
  function costLabel(cost) {
    const map = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    return map[cost] ?? String(cost);
  }
  
  export default function HandCard({ card, isSelected, selectionIndex, onClick }) {
    const theme = COLOR_THEME[card.color] ?? COLOR_THEME.red;
  
    return (
      <div
        onClick={onClick}
        className={`
          relative flex flex-col items-center
          w-20 rounded-xl border-2 cursor-pointer select-none
          bg-gradient-to-b transition-all duration-200
          ${isSelected
            ? `${theme.borderSel} ${theme.bgSel} -translate-y-5 shadow-lg ${theme.glow}`
            : `${theme.border}   ${theme.bg}    translate-y-0`
          }
        `}
        style={{ height: 120, flexShrink: 0 }}
      >
        {/* 选中序号 */}
        {isSelected && (
          <div className={`
            absolute -top-2 -right-2 z-10
            w-5 h-5 rounded-full flex items-center justify-center
            text-xs font-black text-white ${theme.costBg}
          `}>
            {selectionIndex + 1}
          </div>
        )}
  
        {/* 费用徽章（左上角） */}
        <div className={`
          absolute -top-0 -left-0
          w-7 h-7 rounded-tl-xl rounded-br-lg
          flex items-center justify-center
          font-black text-sm text-white ${theme.costBg}
        `}>
          {costLabel(card.cost)}
        </div>
  
        {/* 卡牌图片区域 */}
        <div className="w-full flex-1 mt-1 overflow-hidden rounded-t-xl">
          {card.image ? (
            <img
              src={card.image}
              alt={card.name}
              className="w-full h-full object-cover"
            />
          ) : (
            // 占位符：图片未配置时显示颜色块
            <div className={`
              w-full h-full flex items-center justify-center
              bg-gradient-to-b ${theme.bg} opacity-60
            `}>
              <span className="text-2xl font-black text-white/30">
                {costLabel(card.cost)}
              </span>
            </div>
          )}
        </div>
  
        {/* 底部：颜色点 + 卡名 */}
        <div className={`
          w-full px-1 py-1
          flex items-center gap-1
          bg-black/40 rounded-b-xl
        `}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${theme.dot}`} />
          <span className={`text-xs truncate ${theme.text}`}>
            {card.name}
          </span>
        </div>
      </div>
    );
  }