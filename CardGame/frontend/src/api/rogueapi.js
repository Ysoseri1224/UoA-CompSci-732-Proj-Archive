import client from './client.js';

export async function startRogueRun() {
  const res = await client.post('/api/rogue/start');
  return res.data.data;
}

export async function saveRogueProgress(gameState) {
  const res = await client.put('/api/rogue/save', {
    layer:        gameState.layer,
    playerHp:    gameState.playerHp,
    bossHp:      gameState.bossHp,
    enhancements: gameState.enhancements,
    stats:       gameState.stats,
  });
  return res.data.data;
}

export async function notifyFloorWon(layer, playerHp, enhancements) {
  const res = await client.post('/api/rogue/floor-won', { layer, playerHp, enhancements });
  return res.data.data;
}

export async function chooseEnhancement(enhancement) {
  const res = await client.post('/api/rogue/choose-enhancement', { enhancement });
  return res.data.data;
}

export async function notifyFloorLost() {
  const res = await client.post('/api/rogue/floor-lost');
  return res.data.data;
}

export async function notifyRogueWon() {
  const res = await client.post('/api/rogue/won');
  return res.data.data;
}

export async function getUpgradeOptions(layer, element) {
  const res = await client.get('/api/rogue/upgrades', { params: { layer, element } });
  return res.data.data;
}
