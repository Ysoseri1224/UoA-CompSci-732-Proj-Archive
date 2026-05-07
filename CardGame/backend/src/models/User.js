import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// 子文档：用户解锁的成就记录
const userAchievementSchema = new mongoose.Schema({
  achievementId: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Username is required'], // 遵守英文报错信息规范
    unique: true, 
    minlength: 3, 
    maxlength: 20 
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  avatar: { 
    type: String, 
    default: 'default' 
  },
  // 将战绩统计作为嵌套对象，直接对应 users.js 里的 user.stats.totalGames
  stats: {
    totalGames: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 }
  },
  achievements: [userAchievementSchema]
}, {
  timestamps: true // 自动生成 createdAt 和 updatedAt，贴合 api.md 的需求
});

// 密码加密中间件：在保存前自动将明文密码通过 bcrypt 加密
userSchema.pre('save', async function (next) {
  // 如果密码字段没有被修改，则跳过加密（例如只更新了 avatar 的情况）
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 实例方法：校验密码（完全贴合 users.js 里 `user.comparePassword(oldPassword)` 的调用）
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);