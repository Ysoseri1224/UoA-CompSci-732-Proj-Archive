// src/components/game/HandTypeDisplay.jsx

const TYPE_COLOR = {
    royal_flush:     'text-yellow-300 border-yellow-300',
    straight_flush:  'text-purple-300 border-purple-300',
    four_of_a_kind:  'text-red-300    border-red-300',
    full_house:      'text-orange-300 border-orange-300',
    flush:           'text-blue-300   border-blue-300',
    straight:        'text-cyan-300   border-cyan-300',
    three_of_a_kind: 'text-green-300  border-green-300',
    two_pair:        'text-lime-300   border-lime-300',
    one_pair:        'text-slate-300  border-slate-300',
    high_card:       'text-stone-400  border-stone-400',
  };
  
  const TYPE_BG = {
    royal_flush:     'bg-yellow-900/30',
    straight_flush:  'bg-purple-900/30',
    four_of_a_kind:  'bg-red-900/30',
    full_house:      'bg-orange-900/30',
    flush:           'bg-blue-900/30',
    straight:        'bg-cyan-900/30',
    three_of_a_kind: 'bg-green-900/30',
    two_pair:        'bg-lime-900/30',
    one_pair:        'bg-slate-900/30',
    high_card:       'bg-stone-900/30',
  };
  
  export default function HandTypeDisplay({ evaluation }) {
    const { handType, baseAttack, bonusAttack, multiplier, totalScore } = evaluation;
  
    if (!handType) return null;
  
    const colorClass = TYPE_COLOR[handType.id] ?? TYPE_COLOR.high_card;
    const bgClass    = TYPE_BG[handType.id]    ?? TYPE_BG.high_card;
  
    return (
      <div className={`rounded-lg border ${colorClass} ${bgClass} p-3 flex flex-col gap-2`}>
  
        {/* 牌型名称 */}
        <div className={`text-base font-black tracking-widest ${colorClass.split(' ')[0]}`}>
          {handType.name}
        </div>
  
        {/* 公式行：攻击 + 加成 × 倍率 */}
        <div className="flex items-baseline gap-1 flex-wrap">
          <span className="text-red-400 font-bold text-lg leading-none">
            {baseAttack}
          </span>
          {bonusAttack > 0 && (
            <>
              <span className="text-stone-500 text-xs">+</span>
              <span className="text-yellow-400 font-bold text-sm leading-none">
                {bonusAttack}
              </span>
            </>
          )}
          <span className="text-stone-500 text-xs">×</span>
          <span className="text-yellow-300 font-bold text-lg leading-none">
            {multiplier.toFixed(1)}
          </span>
        </div>
  
        {/* 最终得pts */}
        <div className="flex items-baseline gap-1">
          <span className="text-yellow-100 font-black text-2xl leading-none tracking-tight">
            {totalScore.toLocaleString()}
          </span>
          <span className="text-stone-500 text-xs">pts</span>
        </div>
  
      </div>
    );
  }