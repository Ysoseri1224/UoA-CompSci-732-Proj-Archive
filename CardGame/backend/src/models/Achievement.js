import mongoose from 'mongoose';

const { Schema } = mongoose;

const AchievementSchema = new Schema({
  // Unique identifier for the achievement (e.g., 'first_win')
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  // Category: 'milestone', 'skill', 'hidden', etc.
  type: { type: String, default: 'milestone' },
  // Optional: points or rewards
  value: { type: Number, default: 0 }
}, {
  timestamps: true
});

const Achievement = mongoose.model('Achievement', AchievementSchema);

export { Achievement };