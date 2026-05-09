import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userAchievementSchema = new mongoose.Schema({
  achievementId: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Username is required'], 
    unique: true, 
    minlength: 3, 
    maxlength: 20 
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true 
  },
  // 队友要求的字段名，alias 确保了 API 层的 'password' 映射
  passwordHash: { 
    type: String, 
    required: [true, 'Password is required'],
    alias: 'password', // 建立 API 字段 password 与数据库字段 passwordHash 的映射
    minlength: 8 
  },
  avatar: { 
    type: String, 
    default: 'default' 
  },
  stats: {
    totalGames: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    maxDamage: { type: Number, default: 0 }
  },
  achievements: [userAchievementSchema]
}, {
  timestamps: true,
  // 确保 API 响应时不泄漏 passwordHash
  toJSON: {
    transform: (doc, ret) => {
      delete ret.passwordHash;
      delete ret.__v;
      return ret;
    }
  }
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
