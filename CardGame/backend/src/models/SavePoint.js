import mongoose from 'mongoose';

const savePointSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  roomId: { 
    type: String, 
    required: true 
  },
  snapshot: { 
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