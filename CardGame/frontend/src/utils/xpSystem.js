/**
 * Lobby XP / level / rank — pure frontend progression from user stats.
 * No persistence; totals derive from totalGames, totalWins, winRate, maxDamage.
 */

/** XP required to advance from `level` to `level + 1` (level >= 1). */
export function xpRequiredToAdvance(level) {
  const L = Math.max(1, Math.floor(Number(level)) || 1);
  return Math.floor(500 * L ** 1.35);
}

/**
 * Aggregate XP from stats (non-linear emphasis on wins; optional WR bonus; damage term).
 * @param {{ totalGames?: number, totalWins?: number, winRate?: number, maxDamage?: number }} input
 * @returns {number} Non-negative integer total XP.
 */
export function computeTotalXp(input = {}) {
  const g = Math.max(0, Number(input.totalGames) || 0);
  const w = Math.max(0, Number(input.totalWins) || 0);
  const wr = Math.max(0, Math.min(1, Number(input.winRate) || 0));
  const md = Math.max(0, Number(input.maxDamage) || 0);

  const base = g * 80 + w * 350 + md * 1.2;
  const winRateBonus = Math.floor(wr * 450);

  return Math.max(0, Math.floor(base + winRateBonus));
}

/**
 * Map lifetime XP to level bucket and bar fill.
 * @param {number} totalXp
 * @returns {{ totalXp: number, currentLevel: number, currentLevelXp: number, nextLevelXp: number, progressPercent: number }}
 */
export function xpProgressFromTotal(totalXp) {
  const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
  let level = 1;
  let remaining = xp;
  let guard = 0;
  const maxIterations = 100000;

  while (remaining >= xpRequiredToAdvance(level) && guard < maxIterations) {
    remaining -= xpRequiredToAdvance(level);
    level += 1;
    guard += 1;
  }

  const nextLevelXp = xpRequiredToAdvance(level);
  const progressPercent =
      nextLevelXp > 0 ? Math.min(100, Math.max(0, (remaining / nextLevelXp) * 100)) : 0;

  return {
    totalXp: xp,
    currentLevel: level,
    currentLevelXp: remaining,
    nextLevelXp,
    progressPercent,
  };
}

/**
 * @param {number} level
 * @returns {string} Title-case rank (UI may uppercase).
 */
export function rankTitleForLevel(level) {
  const L = Math.max(1, Math.floor(Number(level)) || 1);
  if (L <= 4) return 'Wanderer';
  if (L <= 9) return 'Ranked Adventurer';
  if (L <= 19) return 'Shadow Hunter';
  if (L <= 34) return 'Abyss Walker';
  if (L <= 49) return 'Rift Knight';
  if (L <= 74) return 'Void Reaper';
  return 'Eternal Sovereign';
}

/** @param {number} n */
export function formatXpWithCommas(n) {
  return Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('en-US');
}

/**
 * Full lobby snapshot: total XP, level bar, rank.
 * @param {{ totalGames?: number, totalWins?: number, winRate?: number, maxDamage?: number }} statsInput
 */
export function computeLobbyXpProgress(statsInput = {}) {
  const total = computeTotalXp(statsInput);
  const prog = xpProgressFromTotal(total);
  return {
    ...prog,
    rankTitle: rankTitleForLevel(prog.currentLevel),
  };
}

/** When stats are missing / not loaded — Level 1, 0 / first threshold XP, Wanderer. */
export function lobbyXpFallback() {
  const nextLevelXp = xpRequiredToAdvance(1);
  return {
    totalXp: 0,
    currentLevel: 1,
    currentLevelXp: 0,
    nextLevelXp,
    progressPercent: 0,
    rankTitle: rankTitleForLevel(1),
  };
}
