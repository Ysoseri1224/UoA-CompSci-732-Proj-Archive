import client from './client.js';

// ---------------------------------------------------------------------------
// Leaderboard API — GET /api/leaderboard
//
// BACKEND PATH NOTE (reported, not fixed here):
//   docs/api.md specifies  GET /api/leaderboard
//   The main branch currently has a 501 stub at GET /api/matches/leaderboard
//   (a different path, likely a leftover from early scaffolding).
//   The feature branch feat/leaderboard-endpoint implements the correct path
//   via routes/index.js but has not been merged to main yet.
//   This function uses /api/leaderboard as documented.
// ---------------------------------------------------------------------------

/**
 * Fetch the global leaderboard.
 * @param {'winRate' | 'totalWins'} [sort='winRate'] - Sort field.
 * @param {number} [page=1]
 * @param {number} [limit=20]
 * @returns {{ rankings: Array, total: number, page: number }}
 */
export async function getLeaderboard(sort = 'winRate', page = 1, limit = 20) {
  const res = await client.get('/api/leaderboard', {
    params: { sort, page, limit },
  });
  return res.data.data;
}
