import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  achievementId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, default: 'default' },
  // 对应 User 模型 stats 中的字段
  conditionType: { 
    type: String, 
    enum: ['totalWins', 'maxLayer', 'maxDamage', 'totalGames'],
    required: true 
  },
  conditionValue: { type: Number, required: true }
}, {
  timestamps: true 
});

export const Achievement = mongoose.model('Achievement', achievementSchema);