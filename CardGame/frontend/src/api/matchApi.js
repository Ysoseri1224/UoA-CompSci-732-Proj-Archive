import client from './client.js';

// ---------------------------------------------------------------------------
// Match API — GET /api/matches/*
//
// All three endpoints are currently 501 stubs on the main branch.
// The Match and MatchReplay MongoDB models have not been created yet.
// These functions match docs/api.md exactly; no changes will be needed
// once the backend implements them.
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated list of matches for a given user.
 * @param {string} userId
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @returns {{ matches: Array, total: number, page: number, totalPages: number }}
 */
export async function getMatches(userId, page = 1, limit = 10) {
  const res = await client.get('/api/matches', {
    params: { userId, page, limit },
  });
  return res.data.data;
}

/**
 * Fetch the details of a single match.
 * @param {string} matchId
 * @returns {object} Match document
 */
export async function getMatch(matchId) {
  const res = await client.get(`/api/matches/${matchId}`);
  return res.data.data;
}

/**
 * Fetch the full replay data for a match.
 * Only accessible by participants of the match (JWT required).
 * @param {string} matchId
 * @returns {object} Replay document including hands and event timeline
 */
export async function getReplay(matchId) {
  const res = await client.get(`/api/matches/${matchId}/replay`);
  return res.data.data;
}
