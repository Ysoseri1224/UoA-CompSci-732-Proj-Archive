import { createSavepoint as buildSavepoint } from '../types/state.js';
import { SavePoint } from '../models/SavePoint.js';
import type { GameState, SavePoint as SavePointType } from '../types/state.js';

// ══════════════════════════════════════════════════════════════════
//  纯数据操作
// ══════════════════════════════════════════════════════════════════

export function createSavepoint(gameState: GameState): SavePointType {
  return buildSavepoint(structuredClone(gameState));
}

export function restoreFromSavepoint(sp: SavePointType): GameState {
  return structuredClone(sp.gameState) as GameState;
}

export function validateSavepoint(sp: unknown): sp is SavePointType {
  if (!sp || typeof sp !== 'object') return false;
  const s = sp as Record<string, unknown>;
  return (
    typeof s.layer === 'number' &&
    typeof s.timestamp === 'number' &&
    s.gameState !== null &&
    typeof s.gameState === 'object'
  );
}

// ══════════════════════════════════════════════════════════════════
//  MongoDB 持久化
// ══════════════════════════════════════════════════════════════════

export async function saveGame(userId: string, roomId: string, snapshot: unknown, layer: number = 1) {
  return await SavePoint.findOneAndUpdate(
    { userId },
    { roomId, snapshot, layer },
    { new: true, upsert: true }
  );
}

export async function loadGame(userId: string) {
  return await SavePoint.findOne({ userId }).lean();
}

export async function clearSave(userId: string) {
  return await SavePoint.deleteOne({ userId });
}
