import { createSavepoint as buildSavepoint } from '../types/state.js';
import type { GameState, SavePoint } from '../types/state.js';

// ══════════════════════════════════════════════════════════════════
//  纯数据操作（序列化 / 反序列化）
// ══════════════════════════════════════════════════════════════════

/**
 * 从 GameState 生成存档点（深拷贝，防止引用污染）
 */
export function createSavepoint(gameState: GameState): SavePoint {
  return buildSavepoint(structuredClone(gameState));
}

/**
 * 从存档点恢复 GameState
 */
export function restoreFromSavepoint(sp: SavePoint): GameState {
  return structuredClone(sp.gameState) as GameState;
}

/**
 * 验证存档点完整性
 */
export function validateSavepoint(sp: unknown): sp is SavePoint {
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
//  DB 持久化（占位，Step 8 实现）
// ══════════════════════════════════════════════════════════════════

/**
 * 保存存档到数据库（占位）
 * Step 8 将对接 SavePoint 模型实现 MongoDB 写入。
 */
export async function persistSavepoint(
  _userId: string,
  _savepoint: SavePoint,
): Promise<void> {
  // TODO: Step 8 — wire to SavePoint model
}

/**
 * 从数据库读取存档（占位）
 * Step 8 将对接 SavePoint 模型实现 MongoDB 读取。
 */
export async function loadSavepoint(
  _userId: string,
): Promise<SavePoint | null> {
  // TODO: Step 8 — wire to SavePoint model
  return null;
}
