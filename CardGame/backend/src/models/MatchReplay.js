import mongoose from 'mongoose';

const { Schema } = mongoose;

const HandRecordSchema = new Schema({
  handNumber: Number,
  holeCards: {
    player: [String],
    bot: [String]
  },
  communityCards: [String],
  // Array of actions: { type: 'bet', player: 'user', amount: 40, street: 'flop' }
  actions: [Schema.Types.Mixed],
  // Array of skill triggers: { name: 'Double Protocol', player: 'bot' }
  skills: [Schema.Types.Mixed],
  result: Schema.Types.Mixed
});

const MatchReplaySchema = new Schema({
  matchId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Match', 
    required: true,
    unique: true 
  },
  playerUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  hands: [HandRecordSchema],
  endedAt: { type: Date, default: Date.now }
});

// Automatic deletion of old replays is typically handled by a cron job or 
// a post-save hook. For simplicity, we ensure an index on endedAt.
MatchReplaySchema.index({ playerUserId: 1, endedAt: -1 });

const MatchReplay = mongoose.model('MatchReplay', MatchReplaySchema);

export { MatchReplay };