// src/components/game/HandArea.jsx
import HandCard from './HandCard.jsx';
import PlayerHUD from './PlayerHUD.jsx';

function PlayerBossDamageFloat({ value }) {
  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      bottom: '100%',
      marginBottom: 8,
      transform: 'translateX(-50%)',
      zIndex: 22,
      animation: 'handPlayerDamageFloat 1.2s ease-out forwards',
      pointerEvents: 'none',
      fontFamily: 'monospace',
      fontWeight: 900,
      fontSize: 28,
      color: '#ff4444',
      textShadow: '0 0 16px rgba(255,50,50,0.9), 0 2px 4px rgba(0,0,0,0.9)',
      whiteSpace: 'nowrap',
    }}>
      -{value.toLocaleString()}
    </div>
  );
}

export default function HandArea({
  hand,
  selected,
  onToggle,
  deckCount,
  displayedPlayerHp,
  playerMaxHp,
  shieldActive,
  playerDamageFlash = null,
  playerHudShakeNonce = 0,
}) {
  return (
    <div style={{
      position:   'relative',
      zIndex:     52,
      height:     175,
      display:    'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 10,
      padding: '0 80px 12px 200px',
      background: `
        linear-gradient(0deg,
          rgba(0,0,0,0.7) 0%,
          rgba(0,0,0,0.3) 40%,
          transparent 100%
        ),
        url('/images/handarea.png') center/cover no-repeat
      `,
      borderTop:  '1px solid rgba(120,80,20,0.3)',
      flexShrink: 0,
      overflow:   'visible',
    }}>

      {/* 桌面顶部线 */}
      <div style={{
        position: 'absolute', top: 0, left: '5%', right: '5%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(200,160,70,0.2), transparent)',
      }} />

      {/* ── 左侧：玩家 HUD ── */}
      <div style={{
        position: 'absolute',
        left: 12,
        bottom: 16,
        zIndex: 10,
      }}>
        {/* 护盾光环 */}
        {shieldActive && (
          <>
            <div style={{
              position: 'absolute', inset: -14, borderRadius: 20,
              border: '2px solid rgba(96,165,250,0.5)',
              animation: 'shieldRing 1.5s ease-out infinite',
              zIndex: 11, pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', inset: -8, borderRadius: 18,
              border: '2px solid rgba(96,165,250,0.8)',
              animation: 'shieldPulse 2s ease-in-out infinite',
              zIndex: 11, pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', top: -4, right: -4,
              width: 24, height: 24,
            }}>
              <img
                src="/images/skill-shield.png"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                alt=""
              />
            </div>
          </>
        )}
        <div
          key={`player-hud-inner-${playerHudShakeNonce}`}
          style={{
            position: 'relative',
            animation: playerHudShakeNonce ? 'handHudShake 0.42s ease' : 'none',
          }}
        >
          {playerDamageFlash && (
            <PlayerBossDamageFloat
              key={playerDamageFlash.id}
              value={playerDamageFlash.amount}
            />
          )}
          <PlayerHUD
            hp={displayedPlayerHp}
            maxHp={playerMaxHp}
            avatar="/images/player.png"
          />
        </div>
      </div>

      {/* ── 手牌 ── */}
      {hand.map((card) => (
        <HandCard
          key={card.id}
          card={card}
          isSelected={selected.includes(card.id)}
          selectionIndex={selected.indexOf(card.id)}
          onClick={() => onToggle(card.id)}
        />
      ))}

      {/* ── 牌库（右下角） ── */}
      <div style={{
        position: 'absolute', right: 16, bottom: 12,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 3,
      }}>
        <div style={{ position: 'relative', width: 44, height: 60 }}>
          {[3, 2, 1].map(i => (
            <div key={i} style={{
              position: 'absolute', inset: 0,
              transform: `translate(${i * 1.5}px, ${i * 1.5}px)`,
              borderRadius: 6,
              border: '1px solid rgba(120,80,20,0.4)',
              background: 'linear-gradient(160deg, #1a1208, #0a0804)',
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

      <style>{`
        @keyframes shieldPulse {
          0%,100% { box-shadow: 0 0 8px rgba(59,130,246,0.4); }
          50%     { box-shadow: 0 0 16px rgba(59,130,246,0.8); }
        }
        @keyframes shieldRing {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes handHudShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-5px); }
          40%     { transform: translateX(5px); }
          60%     { transform: translateX(-3px); }
          80%     { transform: translateX(3px); }
        }
        @keyframes handPlayerDamageFloat {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0px)   scale(1.08); }
          30%  { opacity: 1; transform: translateX(-50%) translateY(-16px) scale(1.2); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-72px) scale(0.85); }
        }
      `}</style>
    </div>
  );
}
