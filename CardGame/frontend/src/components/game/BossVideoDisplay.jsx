// Boss video — modes: idle | attack | defeated
//
// Priority: defeated (boss-hit) > attack > idle
//
// Defeated (boss-hit.mp4):
// - Player victory (presentation `playerWon`) while boss hp <= 0, OR lethal drop prevHp>0 -> hp<=0
// - Blocked entirely when `playerLost` (never play hit on player defeat)
// - Skips bogus first-paint defeat via `hasInitializedHpRef` / prev HP tracking

import { useEffect, useRef, useState } from 'react';

const VIDEO = {
  idle: '/animation/boss-idle.mp4',
  attack: '/animation/boss-attack-2.mp4',
  defeated: '/animation/boss-hit.mp4',
};

/** Opaque centre → feathered edge; fades hard letterbox/frame into abyss without shrinking layout box. */
const BOSS_SOFT_EDGE_MASK =
  'radial-gradient(ellipse 94% 96% at 50% 55%, black 36%, rgba(0,0,0,0.92) 58%, rgba(0,0,0,0.35) 80%, transparent 97%)';

/** Dark fog on periphery only; centre stays transparent so torso stays crisp. */
const BOSS_EDGE_FOG_OVERLAY =
  'radial-gradient(ellipse 102% 100% at 50% 53%, transparent 46%, transparent 62%, rgba(3,8,22,0.38) 79%, rgba(1,5,14,0.88) 100%)';


/** @typedef {'idle' | 'attack' | 'defeated'} BossMode */

export default function BossVideoDisplay({
  bossHp = NaN,
  phase = '',
  battlePhase = null,
  /** `gameOver === 'win'` (or equivalent upstream). */
  playerWon = false,
  /** `gameOver === 'lose'` — blocks boss-hit unconditionally. */
  playerLost = false,
  /** Fires once each time boss-attack playback starts (mode idle→attack). */
  onAttackStart,
  /** Fires once when boss attack clip ends. */
  onAttackEnded = () => {},
  /** Fires once when boss-hit.mp4 finishes naturally (presentation unlock). */
  onDefeatedAnimationEnd = () => {},
}) {
  /** @type {BossMode} */
  const [mode, setMode] = useState('idle');

  const videoRef = useRef(null);
  /** After first lethal / win clip, latch so BOSS_ATTACK banners cannot preempt. */
  const defeatedLatchRef = useRef(false);
  /** True after we queued defeated until boss hp resumes > 0. */
  const defeatedPlayedRef = useRef(false);
  /** Prevents stale 0 hp on first paint / reload from counting as lethal. */
  const hasInitializedHpRef = useRef(false);
  /** HP seen on previous defeated-relevant iteration (NaN until first finite sample). */
  const prevBossHpRef = useRef(NaN);

  const prevPhaseRef = useRef(phase);
  const prevBattlePhaseRef = useRef(battlePhase);
  const prevModeRef = useRef(/** @type {BossMode} */ ('idle'));
  const defeatedEndNotifiedRef = useRef(false);

  const onAttackEndedRef = useRef(onAttackEnded);
  const onAttackStartRef = useRef(onAttackStart);
  const onDefeatedAnimationEndRef = useRef(onDefeatedAnimationEnd);
  onAttackEndedRef.current = onAttackEnded;
  onAttackStartRef.current = onAttackStart;
  onDefeatedAnimationEndRef.current = onDefeatedAnimationEnd;

  // ─── Defeated detection (boss-hit) ───────────────────────────────────────
  useEffect(() => {
    const hp = Number(bossHp);
    if (!Number.isFinite(hp)) return;

    const lost = playerLost === true;
    if (lost) {
      defeatedLatchRef.current = false;
      defeatedPlayedRef.current = false;
      defeatedEndNotifiedRef.current = false;
      hasInitializedHpRef.current = true;
      prevBossHpRef.current = hp;
      return;
    }

    if (!hasInitializedHpRef.current) {
      hasInitializedHpRef.current = true;
      prevBossHpRef.current = hp;
      return;
    }

    const prevHp = prevBossHpRef.current;
    const lethalDrop = prevHp > 0 && hp <= 0;

    const shouldBossHit =
      !defeatedPlayedRef.current &&
      (lethalDrop || playerWon === true);

    if (hp > 0) {
      defeatedLatchRef.current = false;
      defeatedPlayedRef.current = false;
      defeatedEndNotifiedRef.current = false;
      prevBossHpRef.current = hp;
      setMode((m) => (m === 'defeated' ? 'idle' : m));
      return;
    }

    if (shouldBossHit) {
      defeatedPlayedRef.current = true;
      defeatedLatchRef.current = true;
      defeatedEndNotifiedRef.current = false;
      setMode('defeated');
    }

    prevBossHpRef.current = hp;
  }, [bossHp, playerLost, playerWon]);

  // ─── Boss attack banner (blocked while boss-hit latched / victory / lethal) ─
  useEffect(() => {
    if (defeatedLatchRef.current) {
      prevPhaseRef.current = phase;
      prevBattlePhaseRef.current = battlePhase;
      return;
    }

    const hp = Number(bossHp);
    const lost = playerLost === true;
    const won = playerWon === true;
    if (!Number.isFinite(hp) || hp <= 0 || won || lost) {
      prevPhaseRef.current = phase;
      prevBattlePhaseRef.current = battlePhase;
      return;
    }

    const prevPh = prevPhaseRef.current;
    const prevBp = prevBattlePhaseRef.current;

    const enteredBossAttackPhase =
      phase === 'BOSS_ATTACK' && prevPh !== 'BOSS_ATTACK';

    const phaseUnset = !(typeof phase === 'string') || phase.trim() === '';
    const enteredBossBattleBanner =
      phaseUnset &&
      battlePhase === 'boss' &&
      prevBp !== 'boss';

    prevPhaseRef.current = phase;
    prevBattlePhaseRef.current = battlePhase;

    if (enteredBossAttackPhase || enteredBossBattleBanner) {
      setMode((m) => (m === 'defeated' ? m : 'attack'));
    }
  }, [phase, battlePhase, bossHp, playerLost, playerWon]);

  useEffect(() => {
    const prev = prevModeRef.current;
    prevModeRef.current = mode;
    if (mode === 'attack' && prev !== 'attack') {
      onAttackStartRef.current?.();
    }
  }, [mode]);

  function handleEnded() {
    setMode((m) => {
      if (m === 'attack') {
        queueMicrotask(() => onAttackEndedRef.current?.());
        return 'idle';
      }
      if (m === 'defeated') {
        if (!defeatedEndNotifiedRef.current) {
          defeatedEndNotifiedRef.current = true;
          queueMicrotask(() => onDefeatedAnimationEndRef.current?.());
        }
        try {
          videoRef.current?.pause();
        } catch { /* noop */ }
        return 'defeated';
      }
      return m;
    });
  }

  const src = VIDEO[mode];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', isolation: 'isolate' }}>
      <video
        key={`boss-${mode}-${src}`}
        ref={videoRef}
        src={src}
        muted
        playsInline
        autoPlay
        preload="auto"
        loop={mode === 'idle'}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 54%',
          WebkitMaskImage: BOSS_SOFT_EDGE_MASK,
          maskImage: BOSS_SOFT_EDGE_MASK,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        }}
        onLoadedData={(e) => {
          const v = e.currentTarget;
          try {
            v.currentTime = 0;
          } catch { /* noop */ }
          const p = v.play();
          p?.catch((err) => console.warn('[BossVideoDisplay] onLoadedData play:', err));
        }}
        onEnded={handleEnded}
        onError={(e) =>
          console.warn('[BossVideoDisplay] video error', mode, src, e)
        }
      />
      {/* Periphery-only dark veil; reinforces soft mask so black borders read as abyss fog. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
          background: BOSS_EDGE_FOG_OVERLAY,
          WebkitMaskImage: BOSS_SOFT_EDGE_MASK,
          maskImage: BOSS_SOFT_EDGE_MASK,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        }}
      />
    </div>
  );
}
