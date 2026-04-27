import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const {Schema} = mongoose;

const UserSchema = new Schema({
    name: {type: String, required: true},
    username: {type: String, required: true, unique: true},
    avatar: {type: String, default: 'default'},
    email: {type: String, required: true, unique: true, lowercase: true, trim: true},
    passwordHash: {type: String, required: true},
    stats: {
        totalGames: {type: Number, default: 0, min: 0},
        totalWins: {type: Number, default: 0, min: 0},
    },
}, {
    timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'},
});

// Compare a plaintext password with the stored password hash.
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.passwordHash) return false;
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model('User', UserSchema);

export {UserSchema, User}
