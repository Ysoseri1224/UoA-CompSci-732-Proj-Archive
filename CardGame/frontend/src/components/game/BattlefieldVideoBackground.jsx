// Presentation-only: looping battlefield backdrop (no game logic).

const BG_VIDEO_SRC = '/animation/battle-feild-animation.mp4';

/** @param {{ battlePhase: string|null|undefined }} props */
export default function BattlefieldVideoBackground({ battlePhase }) {
  const showBossPulse = battlePhase === 'boss';

  return (
    <>
      {/* Base — visible only at extreme edges under cover crops */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background:
            'radial-gradient(ellipse 100% 100% at 50% 48%, #0c0a09 0%, #050302 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Clip slight scale-up so edges stay tiled with base */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          transform: 'scale(1.05)',
          transformOrigin: 'center center',
          objectFit: 'cover',
          objectPosition: 'center center',
          pointerEvents: 'none',
          opacity: 1,
          filter: 'brightness(1.09) contrast(1.04) saturate(1.02)',
          transition: 'filter 0.35s ease',
        }}
        src={BG_VIDEO_SRC}
      />
      </div>

      {/* Soft vignette — lightened mids so abyss ring reads clearly */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 92% 86% at 50% 50%, rgba(0,0,0,0.02) 38%, rgba(0,0,0,0.14) 70%, rgba(0,0,0,0.32) 100%)',
        }}
      />
      {/* Subtle global grade — weaker than former rgba(0,0,0,0.42) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          pointerEvents: 'none',
          background:
            showBossPulse
              ? 'linear-gradient(180deg, rgba(40,8,12,0.14) 0%, rgba(0,0,0,0.1) 100%)'
              : 'linear-gradient(180deg, rgba(6,4,14,0.12) 0%, rgba(0,0,0,0.08) 100%)',
        }}
      />

      {/* Grid — lighter than before so it reads as texture, not mud */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          pointerEvents: 'none',
          opacity: 0.55,
          background: `
            repeating-linear-gradient(
              0deg,
              transparent, transparent 59px,
              rgba(200,160,70,0.045) 59px,
              rgba(200,160,70,0.045) 60px
            ),
            repeating-linear-gradient(
              90deg,
              transparent, transparent 59px,
              rgba(200,160,70,0.045) 59px,
              rgba(200,160,70,0.045) 60px
            )
          `,
        }}
      />
    </>
  );
}
