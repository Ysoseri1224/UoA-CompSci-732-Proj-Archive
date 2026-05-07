// src/pages/GamePage.jsx
import Battlefield  from '../components/game/Battlefield.jsx';
import HandArea     from '../components/game/HandArea.jsx';
import ScorePanel   from '../components/game/ScorePanel.jsx';
import SkillBar     from '../components/game/SkillBar.jsx';
import { useGameLogic } from '../hooks/useGameLogic.js';

export default function GamePage() {
  const {
    hand,
    deckCount,
    selected,
    toggleSelect,
    evaluation,
    discardSelected,
    discards,
    maxDiscards,
    canDiscard,
    canPlay,
    playHand,
    round,
    totalScore,
    lastScore,
    playerHp,
    playerMaxHp,
    bossHp,
    bossMaxHp,
    floor,
    gameOver,
    restartGame,
    battlePhase,
    attackEffect,
    skillCharges,
    skillCooldowns,
    skillChangeColor,
    skillChangeCost,
    skillActivateShield,
  } = useGameLogic();

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 70% at 50% 30%, #1a1608, #080604)',
        top: 0, zIndex: 50,
      }}
    >

      {/* ── 顶部栏 ── */}
      <div className="flex items-center justify-between px-5
                      flex-shrink-0 border-b border-yellow-900/40
                      bg-gradient-to-b from-stone-950 to-transparent"
           style={{ height: 48 }}
      >
        <div className="font-mono text-yellow-600 text-xs tracking-widest">
          CARD  ROGUE
        </div>
        <div className="flex items-center gap-4">
          <span className="text-yellow-900 text-xs font-mono tracking-widest">
            ROUND  {round}
          </span>
          <span className="text-yellow-900 text-xs font-mono tracking-widest">
            FLOOR  {floor}
          </span>
          <span className="text-yellow-700 text-xs font-mono tracking-widest">
            SCORE  {totalScore.toLocaleString()}
          </span>
        </div>
        <button className="text-stone-600 hover:text-stone-400 text-xs
                           border border-stone-800 rounded px-3 py-1
                           transition-colors">
          ⚙ 设置
        </button>
      </div>

      {/* ── 主体 ── */}
      <div className="flex flex-1 overflow-hidden">

      <SkillBar
  hand={hand}
  skillCooldowns={skillCooldowns}
  skillCharges={skillCharges}
  skillChangeColor={skillChangeColor}
  skillChangeCost={skillChangeCost}
  skillActivateShield={skillActivateShield}
/>

        <Battlefield
          bossHp={bossHp}
          bossMaxHp={bossMaxHp}
          floor={floor}
          lastScore={lastScore}
          battlePhase={battlePhase}
          attackEffect={attackEffect}
        />

        <ScorePanel
          evaluation={evaluation}
          totalScore={totalScore}
          round={round}
          selectedCount={selected.length}
          onPlay={playHand}
          onDiscard={discardSelected}
          discards={discards}
          maxDiscards={maxDiscards}
          canPlay={canPlay}
          canDiscard={canDiscard}
        />

      </div>

      {/* ── 底部手牌 ── */}
      <HandArea
        hand={hand}
        selected={selected}
        onToggle={toggleSelect}
        deckCount={deckCount}
        playerHp={playerHp}
        playerMaxHp={playerMaxHp}
        shieldActive={skillCooldowns.shield}
      />

      {/* ── 游戏结束遮罩 ── */}
      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center
                        bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6
                          bg-stone-900 border border-yellow-800/50
                          rounded-2xl px-12 py-10
                          shadow-2xl shadow-black">

            {gameOver === 'lose' ? (
              <>
                <div className="text-6xl">💀</div>
                <div className="text-red-400 text-3xl font-black tracking-widest">
                  游戏结束
                </div>
                <div className="text-stone-400 text-sm text-center leading-relaxed">
                  到达第 <span className="text-yellow-400 font-bold">{floor}</span> 层<br />
                  累计得分 <span className="text-yellow-400 font-bold">{totalScore.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl">🏆</div>
                <div className="text-yellow-300 text-3xl font-black tracking-widest">
                  通关！
                </div>
              </>
            )}

            <button
              onClick={restartGame}
              className="mt-2 px-8 py-3 rounded-xl font-black text-sm
                         tracking-widest bg-gradient-to-b from-yellow-600
                         to-yellow-800 text-yellow-100
                         hover:from-yellow-500 hover:to-yellow-700
                         active:scale-95 transition-all
                         shadow-lg shadow-yellow-900/50"
            >
              再来一局
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
