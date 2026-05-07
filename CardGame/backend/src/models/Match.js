import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  matchType: { 
    type: String, 
    enum: ['PVE', 'PVP'], 
    default: 'PVE' 
  },
  // 参与者 ID 列表 (包含玩家 ObjectId 或 Boss 的 String ID)
  players: [{ type: String, required: true }], 
  
  // 获胜者 ID
  winner: { type: String }, 
  
  // 核心对局数据
  rounds: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // 对局时长 (秒)
  
  // 技能与筹码记录使用 Map 以支持动态的 key (例如 userId)
  playerSkills: {
    type: Map,
    of: [String], // Key: userId/botId, Value: ["技能1_ID", "技能2_ID"]
    default: {}
  },
  playerSkillUsage: {
    type: Map,
    of: Number,   // Key: "userId_skillId", Value: 使用次数
    default: {}
  },
  finalChips: {
    type: Map,
    of: Number,   // Key: userId, Value: 最终分数/筹码
    default: {}
  },
  endedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true 
});

export const Match = mongoose.model('Match', matchSchema);