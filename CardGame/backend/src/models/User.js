import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  avatar: { type: String, default: 'default' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  
  // Statistics updated after each match as per req_pve.md 8.3
  stats: {
    totalGames: { type: Number, default: 0, min: 0 },
    totalWins: { type: Number, default: 0, min: 0 },
  },
  
  // List of unlocked achievement IDs or slugs
  achievements: [{ type: String }]
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
});

// Password verification helper
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model('User', UserSchema);

export { UserSchema, User };