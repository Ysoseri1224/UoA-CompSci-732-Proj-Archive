// src/components/game/Battlefield.jsx
import { useState, useEffect, useRef } from 'react';
import BossVideoDisplay from './BossVideoDisplay';
import BattlefieldVideoBackground from './BattlefieldVideoBackground';

/** Feather boss video into abyss ring — masks hard rectangle edges while keeping torso readable. */
const BOSS_FEATHER_MASK =
  'radial-gradient(ellipse 104% 124% at 50% 58%, #000 0%, #000 54%, rgba(0,0,0,0.38) 80%, transparent 98%)';

function DamageFloat({ value }) {
  return (
    <div style={{
      position: 'absolute',
      top: '15%', left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      animation: 'floatUp 1.2s ease-out forwards',
      pointerEvents: 'none',
      fontFamily: 'monospace',
      fontWeight: 900,
      fontSize: 40,
      color: '#ff4444',
      textShadow: '0 0 20px rgba(255,50,50,0.9), 0 2px 4px rgba(0,0,0,0.9)',
      whiteSpace: 'nowrap',
    }}>
      -{value.toLocaleString()}
    </div>
  );
}

const ATTACK_EFFECT_META = {
  normal: { label: '乱刃终击', particles: 28 },
  fire: { label: '熔岩爆燃', particles: 42 },
  water: { label: '深海漩涡', particles: 44 },
  nature: { label: '森根突刺', particles: 42 },
};

const SPRITE_EFFECTS = {
  normal: {
    sheet: '/effects/normal-c-sheet.png',
    top: '50%',
    scale: 1.05,
    fps: 24,
  },
  fire: {
    sheet: '/effects/fire-a-sheet.png',
    top: '58%',
    scale: 1.16,
    fps: 22,
  },
  water: {
    sheet: '/effects/water-b-sheet.png?v=2',
    top: '52%',
    scale: 1.15,
    fps: 24,
  },
  nature: {
    sheet: '/effects/nature-b-sheet.png',
    top: '58%',
    scale: 1.14,
    fps: 22,
  },
};

function SpriteSheetEffect({ mode = 'normal' }) {
  const sprite = SPRITE_EFFECTS[mode] ?? SPRITE_EFFECTS.normal;
  const [frame, setFrame] = useState(0);
  const frameSize = 512;
  const columns = 4;
  const frames = 16;
  const x = frame % columns;
  const y = Math.floor(frame / columns);

  useEffect(() => {
    setFrame(0);

    const timer = window.setInterval(() => {
      setFrame(current => {
        if (current >= frames - 1) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 1000 / sprite.fps);

    return () => window.clearInterval(timer);
  }, [mode, sprite.fps]);

  return (
    <div
      className="attack-effect__sprite"
      style={{
        '--sprite-top': sprite.top,
        '--sprite-scale': sprite.scale,
        width: frameSize,
        height: frameSize,
        backgroundImage: `url(${sprite.sheet})`,
        backgroundSize: `${frameSize * columns}px ${frameSize * columns}px`,
        backgroundPosition: `-${x * frameSize}px -${y * frameSize}px`,
      }}
    />
  );
}

function AttackEffect({ mode = 'normal' }) {
  const meta = ATTACK_EFFECT_META[mode] ?? ATTACK_EFFECT_META.normal;
  const particles = Array.from({ length: meta.particles });

  return (
    <div className={`attack-effect attack-effect--${mode}`}>
      <div className="attack-effect__label">{meta.label}</div>
      <div className="attack-effect__flash" />
      <div className="attack-effect__ring attack-effect__ring--one" />
      <div className="attack-effect__ring attack-effect__ring--two" />
      <SpriteSheetEffect mode={mode} />

      {mode === 'normal' && (
        <>
          <div className="attack-effect__slash attack-effect__slash--one" />
          <div className="attack-effect__slash attack-effect__slash--two" />
          <div className="attack-effect__slash attack-effect__slash--three" />
          <div className="attack-effect__slash attack-effect__slash--four" />
          <div className="attack-effect__shockline attack-effect__shockline--one" />
          <div className="attack-effect__shockline attack-effect__shockline--two" />
          <div className="attack-effect__blade-burst" />
        </>
      )}

      {mode === 'fire' && (
        <>
          <div className="attack-effect__ground-crack" />
          <div className="attack-effect__lava-burst attack-effect__lava-burst--one" />
          <div className="attack-effect__lava-burst attack-effect__lava-burst--two" />
          <div className="attack-effect__lava-burst attack-effect__lava-burst--three" />
          <div className="attack-effect__flame attack-effect__flame--one" />
          <div className="attack-effect__flame attack-effect__flame--two" />
          <div className="attack-effect__flame attack-effect__flame--three" />
        </>
      )}

      {mode === 'water' && (
        <>
          <div className="attack-effect__abyss-vortex" />
          <div className="attack-effect__vortex-core" />
          <div className="attack-effect__vortex-ring attack-effect__vortex-ring--one" />
          <div className="attack-effect__vortex-ring attack-effect__vortex-ring--two" />
          <div className="attack-effect__vortex-ring attack-effect__vortex-ring--three" />
          <div className="attack-effect__foam attack-effect__foam--one" />
          <div className="attack-effect__foam attack-effect__foam--two" />
          <div className="attack-effect__wave attack-effect__wave--one" />
          <div className="attack-effect__wave attack-effect__wave--two" />
          <div className="attack-effect__wave attack-effect__wave--three" />
        </>
      )}

      {mode === 'nature' && (
        <>
          <div className="attack-effect__root-slam attack-effect__root-slam--one" />
          <div className="attack-effect__root-slam attack-effect__root-slam--two" />
          <div className="attack-effect__vine attack-effect__vine--one" />
          <div className="attack-effect__vine attack-effect__vine--two" />
          <div className="attack-effect__vine attack-effect__vine--three" />
          <div className="attack-effect__bloom" />
        </>
      )}

      <div className="attack-effect__particles">
        {particles.map((_, index) => (
          <span
            key={index}
            style={{
              '--i': index,
              '--angle': `${(360 / meta.particles) * index}deg`,
              '--distance': `${86 + (index % 5) * 18}px`,
              '--delay': `${(index % 6) * 0.035}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Battlefield({
  bossHp, bossMaxHp,
  floor, lastScore,
  battlePhase,
  phase,
  attackEffect,
  gameOver,
  onBossAttackStart,
  onBossAttackEnded,
  onBossDefeatedAnimationEnd,
}) {
  const playerWon = gameOver === 'win';
  const playerLost = gameOver === 'lose';

  const [floats,  setFloats]  = useState([]);
  const prevScore             = useRef(null);
  const [bossHit, setBossHit] = useState(false);
  const prevBossHp            = useRef(bossHp);

  useEffect(() => {
    if (lastScore && lastScore !== prevScore.current) {
      prevScore.current = lastScore;
      const id = Date.now();
      setFloats(f => [...f, { id, value: lastScore }]);
      setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1300);
    }
  }, [lastScore]);

  useEffect(() => {
    if (bossHp < prevBossHp.current) {
      setBossHit(true);
      setTimeout(() => setBossHit(false), 400);
    }
    prevBossHp.current = bossHp;
  }, [bossHp]);

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0px)   scale(1.3); }
          30%  { opacity: 1; transform: translateX(-50%) translateY(-24px) scale(1.5); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-90px) scale(0.8); }
        }
        @keyframes bossShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-7px); }
          40%     { transform: translateX(7px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
        @keyframes fadeInOut {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          30%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
@keyframes bossAttackFlash {
  0%   { background: rgba(120,0,0,0.0); }
  40%  { background: rgba(200,0,0,0.12); }
  100% { background: rgba(120,0,0,0.0); }
}
        @keyframes attackEffectIn {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.54); filter: blur(3px); }
          10%  { opacity: 1; transform: translate(-50%, -50%) scale(1.14); filter: blur(0); }
          70%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.24); }
        }
        @keyframes attackLabel {
          0%   { opacity: 0; transform: translate(-50%, 10px) scale(0.92); }
          20%  { opacity: 1; transform: translate(-50%, 0) scale(1); }
          78%  { opacity: 1; transform: translate(-50%, -4px) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -16px) scale(0.96); }
        }
        @keyframes attackFlash {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.25); }
          14%  { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2.35); }
        }
        @keyframes attackRing {
          0%   { opacity: 0; transform: translate(-50%, -50%) rotate(-12deg) scale(0.28); }
          16%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(24deg) scale(1.7); }
        }
        @keyframes attackSlashOne {
          0%   { opacity: 0; transform: translate(-92px, 58px) rotate(-24deg) scaleX(0.12); }
          18%  { opacity: 1; transform: translate(-28px, 16px) rotate(-24deg) scaleX(1.1); }
          100% { opacity: 0; transform: translate(105px, -58px) rotate(-24deg) scaleX(0.68); }
        }
        @keyframes attackSlashTwo {
          0%   { opacity: 0; transform: translate(-48px, -54px) rotate(18deg) scaleX(0.12); }
          22%  { opacity: 0.86; transform: translate(12px, -16px) rotate(18deg) scaleX(1); }
          100% { opacity: 0; transform: translate(112px, 48px) rotate(18deg) scaleX(0.58); }
        }
        @keyframes attackSlashThree {
          0%   { opacity: 0; transform: translate(102px, 62px) rotate(-148deg) scaleX(0.08); }
          18%  { opacity: 1; transform: translate(18px, 18px) rotate(-148deg) scaleX(1.18); }
          100% { opacity: 0; transform: translate(-128px, -62px) rotate(-148deg) scaleX(0.56); }
        }
        @keyframes attackSlashFour {
          0%   { opacity: 0; transform: translate(68px, -86px) rotate(132deg) scaleX(0.08); }
          24%  { opacity: 0.95; transform: translate(4px, -20px) rotate(132deg) scaleX(1.1); }
          100% { opacity: 0; transform: translate(-116px, 86px) rotate(132deg) scaleX(0.52); }
        }
        @keyframes bladeBurst {
          0%   { opacity: 0; transform: translate(-50%, -50%) rotate(0deg) scale(0.16); }
          20%  { opacity: 1; transform: translate(-50%, -50%) rotate(22deg) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(78deg) scale(1.55); }
        }
        @keyframes shockline {
          0%   { opacity: 0; transform: translate(-50%, -50%) rotate(var(--r)) scaleX(0.1); }
          24%  { opacity: 0.9; transform: translate(-50%, -50%) rotate(var(--r)) scaleX(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--r)) scaleX(1.5); }
        }
        @keyframes emberFlight {
          0%   { opacity: 0; transform: translate(-50%, -50%) rotate(var(--angle)) translateX(18px) translateY(0) scale(0.35); }
          12%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance)) translateY(calc(-18px - var(--i) * 0.8px)) scale(0.08); }
        }
        @keyframes flameRise {
          0%   { opacity: 0; transform: translate(-50%, 70px) rotate(var(--flame-rotate)) scale(0.25); }
          14%  { opacity: 1; transform: translate(-50%, -8px) rotate(var(--flame-rotate)) scale(1.22); }
          100% { opacity: 0; transform: translate(-50%, -138px) rotate(var(--flame-rotate)) scale(0.78); }
        }
        @keyframes lavaBurst {
          0%   { opacity: 0; transform: translate(-50%, 86px) scaleY(0.08) scaleX(0.42); filter: blur(7px); }
          16%  { opacity: 1; transform: translate(-50%, -10px) scaleY(1.05) scaleX(1); filter: blur(1px); }
          60%  { opacity: 0.9; transform: translate(-50%, -42px) scaleY(1.18) scaleX(0.86); }
          100% { opacity: 0; transform: translate(-50%, -112px) scaleY(0.5) scaleX(1.25); filter: blur(6px); }
        }
        @keyframes groundCrack {
          0%   { opacity: 0; transform: translate(-50%, -50%) scaleX(0.12); }
          18%  { opacity: 1; transform: translate(-50%, -50%) scaleX(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scaleX(1.18); }
        }
        @keyframes waterWave {
          0%   { opacity: 0; transform: translate(-66%, -50%) rotate(var(--wave-rotate)) scaleX(0.12) scaleY(0.55); }
          16%  { opacity: 1; transform: translate(-50%, -50%) rotate(var(--wave-rotate)) scaleX(1.15) scaleY(1.18); }
          100% { opacity: 0; transform: translate(-28%, -50%) rotate(var(--wave-rotate)) translateX(120px) scaleX(0.54) scaleY(0.75); }
        }
        @keyframes tidalWall {
          0%   { opacity: 0; transform: translate(-68%, 70px) rotate(-7deg) scaleX(0.12) scaleY(0.25); filter: blur(5px); }
          18%  { opacity: 0.98; transform: translate(-50%, -12px) rotate(-7deg) scaleX(1.08) scaleY(1); filter: blur(0); }
          68%  { opacity: 0.92; transform: translate(-38%, -24px) rotate(-4deg) scaleX(1) scaleY(1.08); }
          100% { opacity: 0; transform: translate(8%, -10px) rotate(-2deg) scaleX(0.62) scaleY(0.68); filter: blur(7px); }
        }
        @keyframes abyssVortex {
          0%   { opacity: 0; transform: translate(-50%, -50%) rotate(-36deg) scale(0.18); filter: blur(8px); }
          14%  { opacity: 1; transform: translate(-50%, -50%) rotate(28deg) scale(0.9); filter: blur(0); }
          62%  { opacity: 0.95; transform: translate(-50%, -50%) rotate(210deg) scale(1.1); }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(420deg) scale(0.45); filter: blur(7px); }
        }
        @keyframes vortexRing {
          0%   { opacity: 0; transform: translate(-50%, -50%) rotate(var(--vortex-rotate)) scale(0.14); }
          18%  { opacity: 0.95; transform: translate(-50%, -50%) rotate(calc(var(--vortex-rotate) + 110deg)) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(calc(var(--vortex-rotate) + 420deg)) scale(1.55); }
        }
        @keyframes vortexCore {
          0%   { opacity: 0; transform: translate(-50%, -50%) rotate(0deg) scale(0.1); }
          20%  { opacity: 1; transform: translate(-50%, -50%) rotate(180deg) scale(1); }
          72%  { opacity: 0.92; transform: translate(-50%, -50%) rotate(540deg) scale(0.72); }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(760deg) scale(0.16); }
        }
        @keyframes foamSpray {
          0%   { opacity: 0; transform: translate(-50%, 28px) rotate(var(--foam-rotate)) scaleX(0.18); }
          18%  { opacity: 1; transform: translate(-50%, -12px) rotate(var(--foam-rotate)) scaleX(1); }
          100% { opacity: 0; transform: translate(48px, -80px) rotate(var(--foam-rotate)) scaleX(0.48); }
        }
        @keyframes vineStrike {
          0%   { opacity: 0; transform: translate(-150px, 92px) rotate(var(--vine-rotate)) scaleX(0.06) scaleY(0.7); }
          18%  { opacity: 1; transform: translate(-30px, 18px) rotate(var(--vine-rotate)) scaleX(1.18) scaleY(1.12); }
          100% { opacity: 0; transform: translate(112px, -54px) rotate(var(--vine-rotate)) scaleX(0.68) scaleY(0.82); }
        }
        @keyframes rootSlam {
          0%   { opacity: 0; transform: translate(var(--root-x), 148px) rotate(var(--root-rotate)) scaleX(0.03) scaleY(0.58); }
          13%  { opacity: 1; transform: translate(var(--root-x-hit), 4px) rotate(var(--root-rotate)) scaleX(1.18) scaleY(1.3); }
          38%  { opacity: 1; transform: translate(var(--root-x-hit), -18px) rotate(calc(var(--root-rotate) - 10deg)) scaleX(1.28) scaleY(1.42); }
          100% { opacity: 0; transform: translate(116px, -96px) rotate(calc(var(--root-rotate) + 18deg)) scaleX(0.55) scaleY(0.72); }
        }
        @keyframes natureBloom {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.2) rotate(0deg); }
          28%  { opacity: 0.9; transform: translate(-50%, -50%) scale(1) rotate(28deg); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.45) rotate(72deg); }
        }
        .attack-effect {
          --effect-main: #f8d36a;
          --effect-soft: rgba(248, 211, 106, 0.24);
          --effect-hot: rgba(255, 255, 210, 0.95);
          position: absolute;
          top: 48%;
          left: 50%;
          width: min(620px, 72vw);
          height: 390px;
          z-index: 18;
          pointer-events: none;
          transform: translate(-50%, -50%);
          animation: attackEffectIn 1.05s cubic-bezier(.16,1,.3,1) both;
          mix-blend-mode: screen;
        }
        .attack-effect--fire {
          --effect-main: #ff5a12;
          --effect-soft: rgba(255, 48, 10, 0.42);
          --effect-hot: rgba(255, 236, 158, 0.98);
        }
        .attack-effect--water {
          --effect-main: #4ed3ff;
          --effect-soft: rgba(35, 174, 255, 0.42);
          --effect-hot: rgba(210, 250, 255, 0.96);
        }
        .attack-effect--nature {
          --effect-main: #74e05e;
          --effect-soft: rgba(82, 211, 96, 0.40);
          --effect-hot: rgba(226, 255, 184, 0.95);
        }
        .attack-effect__label {
          position: absolute;
          left: 50%;
          top: 16px;
          transform: translateX(-50%);
          padding: 5px 16px;
          border: 1px solid color-mix(in srgb, var(--effect-main) 70%, white 10%);
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(0,0,0,0.64) 16%, rgba(0,0,0,0.64) 84%, transparent);
          color: var(--effect-hot);
          font-family: monospace;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 4px;
          text-shadow: 0 0 12px var(--effect-main), 0 2px 4px rgba(0,0,0,0.9);
          white-space: nowrap;
          animation: attackLabel 1.05s ease both;
        }
        .attack-effect__flash {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 112px;
          height: 112px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--effect-hot) 0%, var(--effect-main) 22%, var(--effect-soft) 55%, transparent 72%);
          filter: blur(4px);
          animation: attackFlash 0.72s ease-out both;
        }
        .attack-effect--fire .attack-effect__flash,
        .attack-effect--water .attack-effect__flash,
        .attack-effect--nature .attack-effect__flash {
          width: 168px;
          height: 168px;
          animation-duration: 0.92s;
        }
        .attack-effect__sprite {
          position: absolute;
          top: var(--sprite-top);
          left: 50%;
          z-index: 3;
          pointer-events: none;
          image-rendering: auto;
          transform: translate(-50%, -50%) scale(var(--sprite-scale));
          transform-origin: center;
          filter: saturate(1.14) contrast(1.08) drop-shadow(0 0 22px var(--effect-soft));
          animation: spriteSheetFade 1.1s ease-out both;
        }
        @keyframes spriteSheetFade {
          0%   { opacity: 0; }
          7%   { opacity: 1; }
          82%  { opacity: 1; }
          100% { opacity: 0; }
        }
        .attack-effect__ring {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 270px;
          height: 104px;
          border-radius: 50%;
          border: 2px solid var(--effect-main);
          box-shadow: 0 0 22px var(--effect-soft), inset 0 0 20px var(--effect-soft);
          animation: attackRing 0.95s ease-out both;
        }
        .attack-effect__ring--two {
          width: 360px;
          height: 144px;
          animation-delay: 0.08s;
          transform: translate(-50%, -50%) rotate(36deg);
        }
        .attack-effect__slash {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 260px;
          height: 22px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent 0%, var(--effect-hot) 28%, var(--effect-main) 52%, transparent 100%);
          box-shadow: 0 0 20px var(--effect-main);
          transform-origin: center;
        }
        .attack-effect__slash--one { animation: attackSlashOne 0.68s cubic-bezier(.18,.78,.28,1) both; }
        .attack-effect__slash--two { animation: attackSlashTwo 0.72s cubic-bezier(.18,.78,.28,1) 0.08s both; }
        .attack-effect__slash--three { animation: attackSlashThree 0.7s cubic-bezier(.18,.78,.28,1) 0.13s both; }
        .attack-effect__slash--four { animation: attackSlashFour 0.74s cubic-bezier(.18,.78,.28,1) 0.19s both; }
        .attack-effect__blade-burst {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 210px;
          height: 210px;
          background:
            conic-gradient(from 0deg, transparent 0 7%, rgba(255,255,235,0.95) 8% 10%, transparent 12% 21%, rgba(248,211,106,0.9) 22% 25%, transparent 27% 37%, rgba(255,255,235,0.88) 38% 40%, transparent 42% 57%, rgba(248,211,106,0.9) 58% 61%, transparent 63% 78%, rgba(255,255,235,0.9) 79% 81%, transparent 83% 100%),
            radial-gradient(circle, rgba(255,255,230,0.8) 0 8%, rgba(248,211,106,0.36) 22%, transparent 58%);
          filter: drop-shadow(0 0 24px rgba(248, 211, 106, 0.9));
          animation: bladeBurst 0.88s ease-out both;
        }
        .attack-effect__shockline {
          --r: 0deg;
          position: absolute;
          top: 50%;
          left: 50%;
          width: 430px;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--effect-main), transparent);
          box-shadow: 0 0 10px var(--effect-main);
          animation: shockline 0.62s ease-out both;
        }
        .attack-effect__shockline--two { --r: 84deg; animation-delay: 0.04s; }
        .attack-effect__flame {
          --flame-rotate: 0deg;
          position: absolute;
          left: 50%;
          bottom: 62px;
          width: 112px;
          height: 224px;
          border-radius: 54% 46% 48% 52% / 72% 72% 28% 28%;
          background: radial-gradient(circle at 50% 72%, var(--effect-hot) 0 12%, #ffb02e 24%, #f04a17 52%, transparent 73%);
          filter: blur(1px) drop-shadow(0 0 24px rgba(255, 90, 18, 0.92));
          transform-origin: 50% 90%;
          animation: flameRise 0.9s ease-out both;
        }
        .attack-effect__flame--two { --flame-rotate: -24deg; left: 43%; animation-delay: 0.06s; }
        .attack-effect__flame--three { --flame-rotate: 22deg; left: 57%; animation-delay: 0.1s; }
        .attack-effect__ground-crack {
          position: absolute;
          left: 50%;
          top: 68%;
          width: 440px;
          height: 78px;
          transform: translate(-50%, -50%);
          background:
            linear-gradient(106deg, transparent 0 8%, rgba(255, 229, 129, 0.95) 10%, #ff5a12 15%, transparent 22% 100%),
            linear-gradient(82deg, transparent 0 19%, rgba(255, 196, 58, 0.95) 21%, #d7330d 26%, transparent 34% 100%),
            linear-gradient(96deg, transparent 0 38%, rgba(255, 245, 180, 0.95) 40%, #ff6418 48%, transparent 58% 100%),
            radial-gradient(ellipse at 50% 55%, rgba(255, 66, 12, 0.7), transparent 70%);
          filter: drop-shadow(0 0 20px rgba(255, 75, 12, 1));
          animation: groundCrack 0.95s ease-out both;
        }
        .attack-effect__lava-burst {
          position: absolute;
          left: 50%;
          bottom: 42px;
          width: 72px;
          height: 230px;
          border-radius: 48% 52% 46% 54% / 16% 16% 84% 84%;
          background:
            radial-gradient(circle at 50% 16%, rgba(255,255,220,0.96) 0 8%, transparent 10%),
            linear-gradient(180deg, rgba(255,245,170,0.95), #ff8b22 28%, #e1340c 58%, rgba(70, 10, 4, 0) 100%);
          box-shadow: 0 0 34px rgba(255, 78, 12, 0.95), 0 0 68px rgba(255, 28, 8, 0.55);
          transform-origin: 50% 100%;
          animation: lavaBurst 1.02s cubic-bezier(.14,.82,.2,1) both;
        }
        .attack-effect__lava-burst--two { left: 42%; width: 56px; height: 190px; animation-delay: 0.08s; }
        .attack-effect__lava-burst--three { left: 59%; width: 62px; height: 205px; animation-delay: 0.14s; }
        .attack-effect__wave {
          --wave-rotate: 0deg;
          position: absolute;
          top: 50%;
          left: 50%;
          width: 390px;
          height: 52px;
          border-radius: 50%;
          border-top: 6px solid var(--effect-hot);
          border-bottom: 3px solid rgba(91, 218, 255, 0.68);
          filter: drop-shadow(0 0 18px rgba(78, 204, 255, 0.82));
          animation: waterWave 0.82s cubic-bezier(.16,1,.3,1) both;
        }
        .attack-effect__wave--two { --wave-rotate: -18deg; animation-delay: 0.07s; }
        .attack-effect__wave--three { --wave-rotate: 18deg; animation-delay: 0.14s; }
        .attack-effect__tidal-wall {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 520px;
          height: 210px;
          border-radius: 52% 48% 46% 54% / 66% 64% 36% 34%;
          background:
            radial-gradient(ellipse at 72% 22%, rgba(235, 255, 255, 0.96) 0 7%, transparent 8%),
            radial-gradient(ellipse at 38% 24%, rgba(220, 250, 255, 0.82) 0 10%, transparent 11%),
            linear-gradient(104deg, transparent 0 10%, rgba(204, 248, 255, 0.92) 20%, rgba(66, 198, 255, 0.78) 42%, rgba(18, 93, 190, 0.52) 72%, transparent 100%);
          box-shadow: 0 0 38px rgba(74, 207, 255, 0.9), inset 0 0 40px rgba(230,255,255,0.32);
          animation: tidalWall 1.04s cubic-bezier(.13,.84,.25,1) both;
        }
        .attack-effect__abyss-vortex {
          position: absolute;
          left: 50%;
          top: 51%;
          width: 430px;
          height: 300px;
          border-radius: 50%;
          background:
            conic-gradient(from 0deg, transparent 0 8%, rgba(224,255,255,0.95) 9% 12%, rgba(68,204,255,0.85) 15% 24%, transparent 31% 38%, rgba(15,78,170,0.62) 42% 55%, rgba(210,250,255,0.92) 59% 62%, transparent 70% 100%),
            radial-gradient(ellipse at 50% 50%, rgba(2, 10, 36, 0.08) 0 18%, rgba(16, 93, 190, 0.52) 24%, rgba(71, 210, 255, 0.42) 36%, transparent 64%);
          box-shadow: inset 0 0 48px rgba(216, 250, 255, 0.36), 0 0 46px rgba(47, 185, 255, 0.88);
          animation: abyssVortex 1.08s cubic-bezier(.13,.84,.25,1) both;
        }
        .attack-effect__vortex-core {
          position: absolute;
          left: 50%;
          top: 51%;
          width: 136px;
          height: 136px;
          border-radius: 50%;
          background:
            radial-gradient(circle, rgba(0, 6, 24, 0.85) 0 24%, rgba(50, 196, 255, 0.75) 27% 34%, rgba(224,255,255,0.95) 38% 42%, transparent 60%),
            conic-gradient(from 0deg, rgba(224,255,255,0.98), rgba(21, 107, 215, 0.18), rgba(100,220,255,0.9), rgba(0, 8, 30, 0.2), rgba(224,255,255,0.98));
          box-shadow: 0 0 34px rgba(125, 229, 255, 0.96), inset 0 0 26px rgba(0, 7, 30, 0.9);
          animation: vortexCore 1.02s cubic-bezier(.13,.84,.25,1) both;
        }
        .attack-effect__vortex-ring {
          --vortex-rotate: 0deg;
          position: absolute;
          left: 50%;
          top: 51%;
          width: 360px;
          height: 118px;
          border-radius: 50%;
          border-top: 7px solid rgba(226,255,255,0.95);
          border-right: 4px solid rgba(72, 205, 255, 0.78);
          border-bottom: 2px solid rgba(15, 92, 190, 0.58);
          filter: drop-shadow(0 0 22px rgba(72, 205, 255, 0.92));
          animation: vortexRing 1.04s ease-out both;
        }
        .attack-effect__vortex-ring--two {
          --vortex-rotate: 62deg;
          width: 430px;
          height: 152px;
          animation-delay: 0.08s;
        }
        .attack-effect__vortex-ring--three {
          --vortex-rotate: -48deg;
          width: 300px;
          height: 98px;
          animation-delay: 0.16s;
        }
        .attack-effect__foam {
          --foam-rotate: -12deg;
          position: absolute;
          top: 43%;
          left: 50%;
          width: 420px;
          height: 22px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(238,255,255,0.95), rgba(111,220,255,0.72), transparent);
          box-shadow: 0 0 20px rgba(167, 236, 255, 0.9);
          animation: foamSpray 0.86s ease-out both;
        }
        .attack-effect__foam--two { --foam-rotate: 17deg; top: 58%; animation-delay: 0.08s; }
        .attack-effect__vine {
          --vine-rotate: -26deg;
          position: absolute;
          top: 50%;
          left: 50%;
          width: 355px;
          height: 28px;
          border-radius: 999px;
          background:
            radial-gradient(circle at 16% 50%, #d9ffb0 0 7px, transparent 8px),
            radial-gradient(circle at 38% 50%, #d9ffb0 0 6px, transparent 7px),
            radial-gradient(circle at 64% 50%, rgba(226,255,184,0.95) 0 5px, transparent 6px),
            linear-gradient(90deg, transparent, #223f15 8%, #4e8e2d 30%, var(--effect-main) 54%, #d9ffb0 66%, transparent);
          box-shadow: 0 0 24px rgba(112, 232, 88, 0.9);
          transform-origin: center;
          animation: vineStrike 0.82s cubic-bezier(.15,.86,.24,1) both;
        }
        .attack-effect__vine--two { --vine-rotate: 9deg; animation-delay: 0.08s; }
        .attack-effect__vine--three { --vine-rotate: -48deg; animation-delay: 0.15s; }
        .attack-effect__root-slam {
          --root-x: -230px;
          --root-x-hit: -54px;
          --root-rotate: -22deg;
          position: absolute;
          top: 50%;
          left: 50%;
          width: 490px;
          height: 58px;
          border-radius: 999px;
          background:
            radial-gradient(circle at 18% 50%, rgba(229,255,180,0.98) 0 10px, transparent 11px),
            radial-gradient(circle at 36% 48%, rgba(170,255,117,0.92) 0 9px, transparent 10px),
            radial-gradient(circle at 55% 52%, rgba(229,255,180,0.78) 0 7px, transparent 8px),
            radial-gradient(circle at 74% 50%, rgba(116,224,94,0.85) 0 8px, transparent 9px),
            linear-gradient(90deg, transparent, #10240a 4%, #264717 16%, #5fb642 50%, #e3ffb2 72%, transparent);
          box-shadow: 0 0 38px rgba(98, 226, 72, 1), 0 0 72px rgba(60, 150, 36, 0.68);
          transform-origin: 16% 50%;
          animation: rootSlam 1.02s cubic-bezier(.12,.78,.23,1) both;
        }
        .attack-effect__root-slam--two {
          --root-x: 210px;
          --root-x-hit: 44px;
          --root-rotate: 202deg;
          animation-delay: 0.12s;
        }
        .attack-effect__bloom {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 150px;
          height: 150px;
          background:
            radial-gradient(ellipse at 50% 8%, rgba(219,255,174,0.9) 0 9%, transparent 10%),
            radial-gradient(ellipse at 92% 50%, rgba(126,228,124,0.75) 0 9%, transparent 10%),
            radial-gradient(ellipse at 50% 92%, rgba(219,255,174,0.8) 0 9%, transparent 10%),
            radial-gradient(ellipse at 8% 50%, rgba(126,228,124,0.75) 0 9%, transparent 10%);
          filter: drop-shadow(0 0 18px rgba(126, 228, 124, 0.86));
          animation: natureBloom 0.92s ease-out both;
        }
        .attack-effect__particles {
          position: absolute;
          inset: 0;
        }
        .attack-effect__particles span {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--effect-hot);
          box-shadow: 0 0 12px var(--effect-main), 0 0 22px var(--effect-soft);
          animation: emberFlight 0.9s ease-out var(--delay) both;
        }
        .attack-effect--water .attack-effect__particles span {
          width: 6px;
          height: 11px;
          border-radius: 999px;
        }
        .attack-effect--nature .attack-effect__particles span {
          width: 11px;
          height: 6px;
          border-radius: 100% 0 100% 0;
        }

        /* ── Boss portal column: breakpoints only touch ≤1512 / ≤1440 / ≤1280 ── */
        @media (max-width: 1512px) {
          .battlefield-boss-area {
            gap: 8px !important;
            padding-top: clamp(12px, 2.2vmin, 26px) !important;
          }
          .battlefield-boss-glow {
            top: 27% !important;
            width: clamp(104px, 18.5vmin, 240px) !important;
            height: clamp(86px, 15vmin, 200px) !important;
          }
          .battlefield-boss-stack {
            gap: 6px !important;
            width: clamp(112px, 16.5vmin, 200px) !important;
            max-width: min(200px, 31vw) !important;
            transform: translateY(clamp(6px, 1.6vmin, 22px)) !important;
          }
          .battlefield-boss-video-frame {
            max-height: clamp(168px, 24vmin, 252px) !important;
            border-radius: 12px !important;
          }
          .battlefield-boss-video-frame > div {
            transform: scale(0.94);
            transform-origin: center 54%;
          }
          .battlefield-boss-info-row {
            flex-wrap: nowrap !important;
            justify-content: space-between !important;
            gap: 4px !important;
            max-width: min(252px, 92vw) !important;
          }
          .battlefield-boss-info-row > div:nth-child(2) {
            flex: 1 1 auto;
            min-width: 0;
            padding-left: 2px !important;
            padding-right: 2px !important;
          }
          .battlefield-boss-info-row > div:first-child,
          .battlefield-boss-info-row > div:last-child {
            width: clamp(28px, 4.9vmin, 38px) !important;
            height: clamp(28px, 4.9vmin, 38px) !important;
            border-width: 1.5px !important;
            font-size: clamp(11px, 2vmin, 14px) !important;
          }
          .battlefield-boss-info-row > div:last-child {
            font-size: clamp(10px, 1.95vmin, 13px) !important;
          }
          .battlefield-boss-info-row .battlefield-boss-name-inline {
            font-size: clamp(9px, 1.85vmin, 11px) !important;
            letter-spacing: 1px !important;
          }
        }
        @media (max-width: 1440px) {
          .battlefield-boss-glow {
            width: clamp(98px, 17vmin, 220px) !important;
            height: clamp(80px, 14vmin, 190px) !important;
          }
          .battlefield-boss-stack {
            width: clamp(104px, 15vmin, 188px) !important;
            max-width: min(188px, 29vw) !important;
          }
          .battlefield-boss-video-frame {
            max-height: clamp(156px, 22vmin, 235px) !important;
          }
          .battlefield-boss-video-frame > div {
            transform: scale(0.9);
          }
          .battlefield-boss-info-row {
            gap: 3px !important;
            max-width: min(236px, 94vw) !important;
          }
          .battlefield-boss-info-row > div:first-child,
          .battlefield-boss-info-row > div:last-child {
            width: clamp(26px, 4.5vmin, 36px) !important;
            height: clamp(26px, 4.5vmin, 36px) !important;
            font-size: clamp(10px, 1.85vmin, 13px) !important;
          }
        }
        @media (max-width: 1280px) {
          .battlefield-boss-area {
            gap: 6px !important;
            padding-top: clamp(10px, 2vmin, 22px) !important;
          }
          .battlefield-boss-glow {
            top: 28% !important;
            width: clamp(92px, 15.5vmin, 200px) !important;
            height: clamp(74px, 12.8vmin, 176px) !important;
          }
          .battlefield-boss-stack {
            width: clamp(96px, 14vmin, 172px) !important;
            max-width: min(172px, 28vw) !important;
            transform: translateY(4px) !important;
          }
          .battlefield-boss-video-frame {
            max-height: clamp(142px, 20vmin, 218px) !important;
            border-radius: 11px !important;
          }
          .battlefield-boss-video-frame > div {
            transform: scale(0.86);
          }
          .battlefield-boss-info-row {
            gap: 2px !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            max-width: min(220px, 96vw) !important;
          }
          .battlefield-boss-info-row > div:first-child,
          .battlefield-boss-info-row > div:last-child {
            width: 24px !important;
            height: 24px !important;
            font-size: 10px !important;
          }
          .battlefield-boss-info-row .battlefield-boss-name-inline {
            font-size: clamp(8px, 1.65vmin, 10px) !important;
          }
          .battlefield-boss-info-row > div:last-child {
            font-size: 9px !important;
          }
        }
      `}</style>

      <div style={{
        position: 'relative', flex: 1,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        borderLeft:  '1px solid rgba(200,160,70,0.2)',
        borderRight: '1px solid rgba(200,160,70,0.2)',
        background: '#050302',
        animation: battlePhase === 'boss' ? 'bossAttackFlash 1s ease-in-out' : 'none',
      }}>

        <BattlefieldVideoBackground battlePhase={battlePhase} />

        {/* 层数标签 */}
        <div style={{
          position: 'absolute', top: 10, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,0.65)',
          border: '1px solid rgba(200,160,70,0.25)',
          borderRadius: 20, padding: '3px 14px',
          backdropFilter: 'blur(6px)',
          zIndex: 50,
        }}>
          <span style={{ color: '#c8a040', fontSize: 11, fontFamily: 'monospace', letterSpacing: 3 }}>
            第 {floor} 层
          </span>
          {floor > 1 && (
            <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 700 }}>
              ▲ BOSS HP +{Math.round((Math.pow(1.5, floor - 1) - 1) * 100)}%
            </span>
          )}
        </div>

        {/* ── 战斗阶段提示横幅 ── */}
        {battlePhase && battlePhase !== 'player' && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 60, pointerEvents: 'none',
            animation: 'fadeInOut 0.4s ease',
          }}>
            <div style={{
              padding: '12px 32px',
              borderRadius: 12,
              fontFamily: 'monospace',
              fontWeight: 900,
              letterSpacing: 3,
              fontSize: 18,
              textAlign: 'center',
              ...(battlePhase === 'boss' ? {
                background: 'rgba(120,0,0,0.9)',
                border: '1px solid #ff3333',
                color: '#ff8888',
                boxShadow: '0 0 24px rgba(255,0,0,0.6), 0 4px 16px rgba(0,0,0,0.6)',
              } : {
                background: 'rgba(0,50,160,0.9)',
                border: '1px solid #60a5fa',
                color: '#bfdbfe',
                boxShadow: '0 0 24px rgba(59,130,246,0.6), 0 4px 16px rgba(0,0,0,0.6)',
              }),
            }}>
              {battlePhase === 'boss'        && '💀  BOSS 回合'}
              {battlePhase === 'shield_break' && '🛡️  护盾吸收！'}
            </div>
          </div>
        )}

        {/* ── BOSS 区域 — 前景层；手牌栏通过 GamePage sibling z-index 压在其上 ── */}
        <div className="battlefield-boss-area" style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, paddingTop: 32,
          position: 'relative',
          zIndex: 45,
        }}>

          {attackEffect && <AttackEffect key={attackEffect.id} mode={attackEffect.mode} />}

          {/* 伤害飘字 */}
          {floats.map(f => <DamageFloat key={f.id} value={f.value} />)}

          {/* Boss 氛围光 — 下移与立柱对齐 */}
          <div className="battlefield-boss-glow" style={{
            position: 'absolute', top: '26%', left: '50%',
            transform: 'translate(-50%, 0)',
            width: 'clamp(120px, 24vmin, 280px)',
            height: 'clamp(100px, 20vmin, 240px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(120,40,140,0.2) 0%, rgba(80,15,120,0.1) 45%, transparent 78%)',
            filter: 'blur(22px)',
            pointerEvents: 'none',
            zIndex: 8,
          }} />

          {/* Boss 立柱：整体下移对齐圆环几何中心 */}
          <div className="battlefield-boss-stack" style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            width: 'clamp(132px, 20vmin, 228px)',
            maxWidth: 'min(228px, 36vw)',
            transform: 'translateY(clamp(16px, 3.2vmin, 32px))',
          }}>
            <div className="battlefield-boss-video-frame" style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '3 / 5',
              maxHeight: 'clamp(200px, 30vmin, 300px)',
              borderRadius: 14,
              overflow: 'hidden',
              background: `
                radial-gradient(ellipse 90% 88% at 50% 70%, rgba(24,14,42,0.55) 0%, rgba(4,6,14,1) 75%),
                linear-gradient(180deg, rgba(10,10,24,1) 0%, rgba(2,4,12,1) 100%)
              `,
              WebkitMaskImage: BOSS_FEATHER_MASK,
              maskImage: BOSS_FEATHER_MASK,
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              boxShadow: bossHit
                ? '0 0 26px rgba(255,60,70,0.32), inset 0 1px 0 rgba(255,255,255,0.06)'
                : '0 16px 36px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.04)',
              animation: bossHit ? 'bossShake 0.4s ease' : 'none',
              filter: bossHit ? 'brightness(1.12) saturate(1.22)' : 'brightness(1.02)',
              transition: 'filter 0.15s ease, box-shadow 0.2s ease',
            }}>
              <BossVideoDisplay
                bossHp={bossHp}
                phase={phase}
                battlePhase={battlePhase}
                playerWon={playerWon}
                playerLost={playerLost}
                onAttackStart={onBossAttackStart}
                onAttackEnded={onBossAttackEnded ?? (() => {})}
                onDefeatedAnimationEnd={onBossDefeatedAnimationEnd ?? (() => {})}
              />

              {/* 内缘柔化与深渊融合的暗角 */}
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                pointerEvents: 'none',
                zIndex: 9,
                boxShadow:
                  'inset 0 0 52px rgba(0,0,0,0.62), inset 0 18px 40px rgba(8,6,26,0.45), inset 0 -36px 64px rgba(4,4,14,0.75)',
              }} />

              {/* 底部轻压暗 — 仅占底缘 */}
              <div style={{
                position: 'absolute',
                left: 0, right: 0, bottom: 0,
                height: '24%',
                background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 100%)',
                pointerEvents: 'none',
                zIndex: 11,
              }} />
            </div>

            {/* 名称 / 攻防 — 窄于或过宽时用 maxWidth 对齐立柱 */}
            <div className="battlefield-boss-info-row" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(6px, 1.8vmin, 12px)',
              flexWrap: 'wrap',
              padding: '0 2px',
              maxWidth: 'min(260px, 42vw)',
            }}>
              <div style={{
                width: 'clamp(36px, 6vmin, 44px)',
                height: 'clamp(36px, 6vmin, 44px)',
                flexShrink: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 28%, #f0c030, #7a5000)',
                border: '2px solid rgba(255,215,96,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 'clamp(13px, 2.6vmin, 16px)', color: '#fff',
                boxShadow: '0 0 12px rgba(220,170,0,0.4), 0 3px 8px rgba(0,0,0,0.7)',
                fontFamily: '"Cinzel", monospace',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              }}>
                5
              </div>
              <div style={{
                minWidth: 0,
                textAlign: 'center',
                padding: '4px clamp(10px, 3vmin, 16px)',
                borderRadius: 999,
                background: 'linear-gradient(90deg, rgba(0,0,0,0.2), rgba(0,0,0,0.72), rgba(0,0,0,0.2))',
                border: '1px solid rgba(200,160,90,0.22)',
              }}>
                <span className="battlefield-boss-name-inline" style={{
                  color: '#e8cfa0',
                  fontSize: 'clamp(10px, 2.2vmin, 12px)',
                  fontWeight: 800,
                  letterSpacing: 2,
                  fontFamily: 'serif',
                  textShadow: '0 0 10px rgba(200,170,110,0.32), 0 1px 3px rgba(0,0,0,1)',
                  whiteSpace: 'nowrap',
                }}>
                  暗影领主
                </span>
              </div>
              <div style={{
                width: 'clamp(36px, 6vmin, 44px)',
                height: 'clamp(36px, 6vmin, 44px)',
                flexShrink: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 28%, #cc2222, #440808)',
                border: '2px solid rgba(255,110,110,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900,
                fontSize: bossHp > 999 ? 9 : 'clamp(12px, 2.6vmin, 15px)',
                color: '#fff',
                boxShadow: '0 0 12px rgba(200,30,40,0.45), 0 3px 8px rgba(0,0,0,0.7)',
                fontFamily: '"Cinzel", monospace',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              }}>
                {bossHp > 9999
                  ? `${Math.round(bossHp/1000)}k`
                  : bossHp > 999
                    ? `${(bossHp/1000).toFixed(1)}k`
                    : bossHp
                }
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
