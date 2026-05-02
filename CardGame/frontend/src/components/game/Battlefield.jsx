// src/components/game/Battlefield.jsx

export default function Battlefield({
    playerHp,
    playerMaxHp,
    bossHp,
    bossMaxHp,
    floor,
    shieldActive,
    lastScore,
  }) {
    const bossHpPct   = Math.max(0, (bossHp   / bossMaxHp)   * 100);
    const playerHpPct = Math.max(0, (playerHp / playerMaxHp) * 100);
  
    return (
      <div
        className="relative flex-1 flex flex-col overflow-hidden border-x border-yellow-900/30"
        style={{
          background: `
            repeating-linear-gradient(
              45deg, transparent, transparent 40px,
              rgba(255,255,255,0.008) 40px, rgba(255,255,255,0.008) 41px
            ),
            linear-gradient(180deg, #0d1208 0%, #111a0e 50%, #0d1208 100%)
          `,
        }}
      >
        {/* 中央分界线 */}
        <div className="absolute left-[8%] right-[8%] top-1/2 -translate-y-1/2
                        h-px bg-gradient-to-r from-transparent via-yellow-900/50 to-transparent" />
  
        {/* 层数标签 */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2
                        flex items-center gap-2
                        bg-stone-900/80 border border-yellow-900/50
                        rounded-full px-4 py-1">
          <span className="text-yellow-600 text-xs tracking-widest font-mono">
            第 {floor} 层
          </span>
          {floor > 1 && (
            <span className="text-red-500 text-xs">
              ▲ Boss HP +{Math.round((Math.pow(1.5, floor - 1) - 1) * 100)}%
            </span>
          )}
        </div>
  
        {/* ── 上半：BOSS 区域 ── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 pb-4 pt-8">
  
          <div className="text-red-400/60 text-xs tracking-widest font-mono">
            BOSS · {bossMaxHp.toLocaleString()} HP
          </div>
  
          {/* Boss 头像 */}
          <div className="relative w-20 h-20 rounded-full
                          border-2 border-red-800
                          bg-gradient-to-b from-red-950 to-stone-950
                          flex items-center justify-center
                          shadow-lg shadow-red-900/50">
            <span className="text-4xl">🧙</span>
            {/* 攻击力标签 */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2
                            bg-red-900 border border-red-700
                            rounded-full px-2 py-0.5
                            text-red-300 text-xs font-black whitespace-nowrap">
              ATK 5
            </div>
          </div>
  
          {/* Boss 血条 */}
          <div className="w-52 flex flex-col gap-1 mt-1">
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">HP</span>
              <span className="text-red-400 font-mono font-bold">
                {bossHp.toLocaleString()} / {bossMaxHp.toLocaleString()}
              </span>
            </div>
            <div className="h-3 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div
                className="h-full bg-gradient-to-r from-red-900 to-red-500
                           rounded-full transition-all duration-700"
                style={{ width: `${bossHpPct}%` }}
              />
            </div>
          </div>
  
          {/* 上次造成的伤害 */}
          {lastScore > 0 && (
            <div className="text-orange-400 text-xs font-mono">
              上次造成伤害：
              <span className="text-orange-300 font-black text-sm ml-1">
                -{lastScore.toLocaleString()}
              </span>
            </div>
          )}
  
        </div>
  
        {/* ── 下半：玩家区域 ── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 pt-4">
  
          {/* 玩家头像 + 护盾 */}
          <div className="relative">
            {shieldActive && (
              <>
                <div className="absolute -inset-3 rounded-full border-2
                                border-blue-400/60 animate-ping" />
                <div className="absolute -inset-2 rounded-full border-2
                                border-blue-400 shadow-lg shadow-blue-500/50" />
              </>
            )}
  
            <div className={`
              relative w-20 h-20 rounded-full flex items-center justify-center
              shadow-lg transition-all duration-300
              ${shieldActive
                ? 'border-2 border-blue-400 bg-gradient-to-b from-blue-950 to-stone-950'
                : 'border-2 border-green-800 bg-gradient-to-b from-green-950 to-stone-950'
              }
            `}>
              <span className="text-4xl">🛡️</span>
              {shieldActive && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full
                                bg-blue-500 border-2 border-blue-300
                                flex items-center justify-center text-xs">
                  🛡
                </div>
              )}
            </div>
          </div>
  
          {/* 玩家血条 */}
          <div className="w-52 flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">HP</span>
              <span className="text-green-400 font-mono font-bold">
                {playerHp} / {playerMaxHp}
              </span>
            </div>
            <div className="h-3 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${playerHpPct}%`,
                  background: playerHpPct > 50
                    ? 'linear-gradient(90deg,#166534,#22c55e)'
                    : playerHpPct > 25
                      ? 'linear-gradient(90deg,#854d0e,#eab308)'
                      : 'linear-gradient(90deg,#7f1d1d,#ef4444)',
                }}
              />
            </div>
            {/* HP格子（直观显示剩余回合） */}
            <div className="flex gap-1 mt-1">
              {Array.from({ length: playerMaxHp }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-300
                    ${i < playerHp ? 'bg-green-500' : 'bg-stone-700'}`}
                />
              ))}
            </div>
            <div className="text-stone-600 text-xs text-center">
              还能承受 {Math.floor(playerHp / 5)} 次攻击
            </div>
          </div>
  
        </div>
  
      </div>
    );
  }