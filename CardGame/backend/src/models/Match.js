import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  matchType: { type: String, enum: ['PVE', 'PVP'], default: 'PVE' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bossId: { type: String, required: true }, 
  layer: { type: Number, default: 1 },
  isWin: { type: Boolean, default: false },
  chosenElement: { type: String, enum: ['WATER', 'FIRE', 'GRASS'] },
  totalDamageDealt: { type: Number, default: 0 },
  roundsPlayed: { type: Number, default: 0 },
  endedAt: { type: Date, default: Date.now }
}, {
  timestamps: true 
});

export const Match = mongoose.model('Match', matchSchema);