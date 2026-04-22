import client from './client.js';

// ---------------------------------------------------------------------------
// User API — GET/PUT /api/users/*
//
// NOTE: GET /api/users/:userId and PUT /api/users/me are implemented in the
// remote branch feat/user-userid but have not yet been merged to main.
// These functions will return a 501 response until that PR is merged.
// The function signatures match docs/api.md so no changes will be needed later.
// ---------------------------------------------------------------------------

/**
 * Fetch a user's public profile.
 * @param {string} userId - MongoDB ObjectId string.
 * @returns {object} { username, avatar, createdAt, totalGames, totalWins, achievements }
 */
export async function getProfile(userId) {
  const res = await client.get(`/api/users/${userId}`);
  return res.data.data;
}

/**
 * Update the currently authenticated user's profile.
 * Requires a valid JWT (injected automatically by the request interceptor).
 * @param {{ username?: string, avatar?: string }} data
 * @returns {object} { _id, username, avatar }
 */
export async function updateProfile(data) {
  const res = await client.put('/api/users/me', data);
  return res.data.data;
}

/**
 * Change the currently authenticated user's password.
 * @param {string} oldPassword
 * @param {string} newPassword
 */
export async function changePassword(oldPassword, newPassword) {
  await client.put('/api/users/me/password', { oldPassword, newPassword });
}

/**
 * Fetch the detailed stats for a user (win rate, top skills, etc.).
 * @param {string} userId
 * @returns {object} { totalGames, winRate, avgDuration, topSkills, bestSkill }
 */
export async function getUserStats(userId) {
  const res = await client.get(`/api/users/${userId}/stats`);
  return res.data.data;
}

/**
 * Fetch the achievements unlocked by a user.
 * @param {string} userId
 * @returns {Array<{ achievementId: string, unlockedAt: string }>}
 */
export async function getUserAchievements(userId) {
  const res = await client.get(`/api/users/${userId}/achievements`);
  return res.data.data;
}
