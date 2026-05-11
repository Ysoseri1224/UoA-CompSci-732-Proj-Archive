import React from 'react';

export default function EnhancementModal({ options, floor, onConfirm }) {
  if (!options || options.length === 0) return null;

  // 卡牌整体样式
  const cardFrameStyle = {
    backgroundImage: "url('/images/cardbackground.png')",
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',

    // 叠加暗色增强层次感
    backgroundBlendMode: 'multiply',
    backgroundColor: 'rgba(0,0,0,0.22)',

    width: '260px',
    height: '390px',

    cursor: 'pointer',

    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',

    color: '#e4d5b7',
    fontFamily: '"Georgia", "Palatino Linotype", serif',

    transition: 'all 0.25s ease',

    position: 'relative',
    overflow: 'hidden',

    border: 'none',
    boxShadow: 'none',
  };

  // 属性配置
  const runeConfig = {
    blue: {
      symbol: 'á›š',
      glow: 'rgba(44,130,201,0.85)',
      image: '/images/icon-water.png',
    },

    red: {
      symbol: 'áš²',
      glow: 'rgba(255,80,40,0.85)',
      image: '/images/icon-fire.png',
    },

    green: {
      symbol: 'á›’',
      glow: 'rgba(67,233,123,0.85)',
      image: '/images/icon-nature.png',
    },

    WATER: {
      symbol: 'ᛚ',
      glow: 'rgba(44,130,201,0.85)',
      image: '/images/icon-water.png',
    },

    FIRE: {
      symbol: 'ᚲ',
      glow: 'rgba(255,80,40,0.85)',
      image: '/images/icon-fire.png',
    },

    GRASS: {
      symbol: 'ᛒ',
      glow: 'rgba(67,233,123,0.85)',
      image: '/images/icon-nature.png',
    },
  };

  // 无属性卡
  const defaultRuneConfig = {
    symbol: '⚡',
    glow: 'rgba(212,192,161,0.85)',
    image: null,
  };

  // buff type → icon 映射
  const buffTypeIconMap = {
    HAND_CHIPS_BONUS:            '/images/icon-chipsbonus.png',
    HAND_MULT_BONUS:             '/images/icon-multbonus.png',
    HP_BONUS:                    '/images/icon-HP+5.png',
    SKILL_ENERGY_MAX:            '/images/icon-skill+1.png',
    HIGH_RANK_DRAW_ON_SHUFFLE:   '/images/icon-kcard.png',
    TIERED_MULT_BONUS:           '/images/icon-mulbonus.png',
    TIERED_CHIPS_BONUS:          '/images/icon-chipsbonus.png',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,

        background:
          'radial-gradient(circle at center, rgba(20,20,25,0.45), rgba(5,5,8,0.88))',

        backdropFilter: 'blur(10px)',

        display: 'flex',
        flexDirection: 'column',

        justifyContent: 'center',
        alignItems: 'center',

        zIndex: 9999,
      }}
    >
      {/* 标题 */}
      <h2
    style={{
      fontSize: '2rem',
      marginBottom: '12px',
      color: '#e4d5b7',
      fontWeight: '600',
      letterSpacing: '2px',
      fontFamily: '"Cinzel", serif',
      textShadow: '0 2px 8px rgba(0,0,0,0.5)',
    }}
  >
    You Have Cleared Floor {floor}
  </h2>

  <p
    style={{
      fontSize: '0.95rem',
      color: '#b89a6a',
      letterSpacing: '1px',
      fontFamily: '"Georgia", serif',
      fontStyle: 'italic',
      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    }}
  >
    Please Choose Your Enhancement Path
  </p>

      {/* 卡牌区域 */}
      <div
        style={{
          display: 'flex',
          gap: '55px',
        }}
      >
        {options.map((opt) => {
          const buffElement = opt.buff?.element;
          const buffType = opt.buff?.type;
          const rune = (opt.color && runeConfig[opt.color])
            || (buffElement && runeConfig[buffElement])
            || (opt.element && runeConfig[opt.element])
            || defaultRuneConfig;

          const iconSrc = (buffType && buffTypeIconMap[buffType])
            ?? opt.icon
            ?? rune.image;

          return (
            <div
              key={opt.id}
              onClick={() => onConfirm(opt)}
              style={cardFrameStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-12px)';
                e.currentTarget.style.filter = 'brightness(1.08)';

                e.currentTarget.style.boxShadow = `
                  0 0 25px ${rune.glow},
                  0 0 60px ${rune.glow}
                `;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.filter = 'brightness(1)';

                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* 中央内容区域 */}
              <div
                style={{
                  flex: 1,

                  width: '100%',

                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',

                  position: 'relative',
                }}
              >
                {/* 中央暗化层 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '5%',
                    left: '10%',
                    right: '10%',
                    bottom: '5%',

                    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.1), rgba(0,0,0,0.5))',
                    borderRadius: '20px',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                />

                {/* 属性图标 */}
                {iconSrc ? (
                  <img
                    src={iconSrc}
                    alt={opt.label}
                    style={{
                      width: '180px',
                      height: '180px',

                      objectFit: 'contain',

                      position: 'relative',
                      zIndex: 2,

                      filter: `
                        drop-shadow(0 0 18px ${rune.glow})
                        drop-shadow(0 0 40px ${rune.glow})
                      `,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: '9rem',

                      color: '#d4c0a1',

                      position: 'relative',
                      zIndex: 2,

                      textShadow: `
                        0 0 18px ${rune.glow},
                        0 0 40px ${rune.glow}
                      `,
                    }}
                  >
                    {rune.symbol}
                  </div>
                )}
              </div>

              {/* 描述 */}
              <div
                style={{
                  width: '82%',

                  marginBottom: '22px',

                  padding: '10px 14px',

                  textAlign: 'center',

                  color: '#d4c0a1',

                  fontSize: '0.92rem',
                  lineHeight: '1.55',

                  fontStyle: 'italic',

                  textShadow:
                    '0 2px 4px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.5)',

                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {opt.description}
              </div>

              {/* 底部符文 */}
              <div
                style={{
                  marginBottom: '14px',

                  color: '#6d6457',

                  fontSize: '0.75rem',

                  letterSpacing: '2px',

                  opacity: 0.8,
                }}
              >
                ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚻ
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
