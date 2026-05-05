import mongoose from 'mongoose';

const { Schema } = mongoose;

const MatchSchema = new Schema({
  // 'player' userId or 'bot'
  winnerId: { type: String, required: true },
  loserId: { type: String, required: true },
  
  // Reference to the human player for indexing
  playerUserId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  
  duration: { type: Number, default: 0 }, // match duration in seconds
  handsPlayed: { type: Number, default: 0 },
  
  // Skill usage counters: { "Clue Sniffing": 2 }
  playerSkillsUsed: {
    type: Map,
    of: Number,
    default: {}
  },
  botSkillsUsed: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Final chip counts
  finalChips: {
    player: { type: Number, default: 0 },
    bot: { type: Number, default: 0 }
  },

  endedAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

const Match = mongoose.model('Match', MatchSchema);

export { Match };