export function shouldAdvanceRound({ bossDefeated, playerDefeated }) {
  return !bossDefeated && !playerDefeated;
}
