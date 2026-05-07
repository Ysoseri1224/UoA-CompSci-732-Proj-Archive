import { SavePoint } from '../models/SavePoint.js';

/**
 * 保存游戏状态快照
 */
export async function saveGame(userId: string, roomId: string, snapshot: any, layer: number = 1) {
  return await SavePoint.findOneAndUpdate(
    { userId },
    { roomId, snapshot, layer },
    { new: true, upsert: true }
  );
}

/**
 * 加载游戏状态
 */
export async function loadGame(userId: string) {
  return await SavePoint.findOne({ userId }).lean();
}

/**
 * 清除存档（通关或失败时）
 */
export async function clearSave(userId: string) {
  return await SavePoint.deleteOne({ userId });
}