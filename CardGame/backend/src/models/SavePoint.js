import mongoose from 'mongoose';

const savePointSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true // 确保每个用户只有一个“当前进行中”的存档。如果允许开多个档，去掉此项
  },
  roomId: { 
    type: String, 
    required: true 
  },
  // 核心：存储整个 XState 的快照 JSON
  // 这里使用 Object (Mixed) 类型，因为 XState 的快照结构比较复杂，
  // 包含了 value, context (即你的 room, player, bot), status 等。
  snapshot: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  layer: { 
    type: Number, 
    default: 1 // 预留给未来的层数进度
  }
}, {
  timestamps: true // 记录存档时间和创建时间
});

export const SavePoint = mongoose.model('SavePoint', savePointSchema);