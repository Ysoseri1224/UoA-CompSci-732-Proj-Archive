import mongoose from 'mongoose';

const {Schema} = mongoose;

const UserSchema = new Schema({
    name: {type: String, required: true},
    username: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true, lowercase: true, trim: true},
    passwordHash: {type: String, required: true},
    stats: {
        totalGames: {type: Number, default: 0, min: 0},
        totalWins: {type: Number, default: 0, min: 0},
    },
}, {
    timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'},
});

const User = mongoose.model('User', UserSchema);

export {UserSchema, User}