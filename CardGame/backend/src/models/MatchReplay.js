import mongoose from 'mongoose';

// 子文档：单次操作事件 (对应 api.md 中的 events)
const replayEventSchema = new mongoose.Schema({
  timestamp: { type: Number },
  type: { type: String, required: true }, // 例如 "bet", "play_card"
  actor: { type: String, required: true }, // 操作者 ID
  data: { type: mongoose.Schema.Types.Mixed } // 具体数据，如 { action: "raise", amount: 40 }
}, { _id: false });

// 子文档：回合结算结果 (对应 api.md 中的 result)
const handResultSchema = new mongoose.Schema({
  winners: [{ type: String }],
  pot: { type: Number },
  handScores: { type: Map, of: Number }, // Key: userId, Value: 28.3
  handRanks: { type: Map, of: String }   // Key: userId, Value: "Straight"
}, { _id: false });

// 子文档：单回合/单手牌 (对应 api.md 中的 hands)
const handSchema = new mongoose.Schema({
  handNumber: { type: Number, required: true },
  holeCards: { 
    type: Map, 
    of: [String] // Key: userId, Value: ["As", "Kh"]
  },
  communityCards: [{ type: String }],
  events: [replayEventSchema],
  result: handResultSchema
}, { _id: false });

const matchReplaySchema = new mongoose.Schema({
  matchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Match', 
    required: true, 
    unique: true 
  },
  // 核心回放数据，完全对齐 api.md
  hands: [handSchema],
  
  // 保留随机种子，方便某些特定需要彻底复现底层的场景
  seed: { type: String }
}, { 
  timestamps: true 
});

export const MatchReplay = mongoose.model('MatchReplay', matchReplaySchema);