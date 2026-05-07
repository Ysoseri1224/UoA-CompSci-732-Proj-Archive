import mongoose from 'mongoose';

const matchReplaySchema = new mongoose.Schema({
  matchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Match', 
    required: true, 
    unique: true 
  },
  // 按照 api.md 要求存储完整的历史记录
  history: [{
    step: { type: Number, required: true },
    action: { type: mongoose.Schema.Types.Mixed },     // 存储如 { type: 'PLAY_CARDS', payload: [...] }
    stateAfter: { type: mongoose.Schema.Types.Mixed }  // 存储该步骤后的快照（room + player + bot）
  }],
  seed: { type: String }, // 记录随机种子以便完全复现
}, { 
  timestamps: true 
});

export const MatchReplay = mongoose.model('MatchReplay', matchReplaySchema);