import mongoose from 'mongoose';

const replayEventSchema = new mongoose.Schema({
  timestamp: { type: Number },
  type: { type: String, required: true }, // 'SHUFFLE', 'PLAY_CONFIRM' 等
  actor: { type: String, required: true }, 
  data: { type: mongoose.Schema.Types.Mixed } 
}, { _id: false });

const handResultSchema = new mongoose.Schema({
  handType: { type: String },    
  baseScore: { type: Number },   
  multiplier: { type: Number },  
  totalDamage: { type: Number }, 
  chips: { type: Number }        
}, { _id: false });

const turnSchema = new mongoose.Schema({
  turnNumber: { type: Number, required: true },
  initialHand: [{ type: String }], // 格式 "{ELEMENT}_{rank}"
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
  turns: [turnSchema]
}, {
  timestamps: true
});

export const MatchReplay = mongoose.model('MatchReplay', matchReplaySchema);