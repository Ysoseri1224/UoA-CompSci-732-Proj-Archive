import mongoose from 'mongoose';

const savePointSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  runId: { 
    type: String, 
    required: true 
  },
  // 存储符合 GameState 接口的自定义状态
  gameState: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  layer: { 
    type: Number, 
    required: true,
    default: 1 
  }
}, {
  timestamps: true 
});

export const SavePoint = mongoose.model('SavePoint', savePointSchema);