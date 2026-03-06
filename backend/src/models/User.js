import mongoose, { Schema } from 'mongoose';















const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['User', 'Interviewer', 'Admin'], default: 'User' },
  xp: { type: Number, default: 0, index: true },
  level: { type: Number, default: 1 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: { type: Date, default: null },
  bookmarks: [{ type: Schema.Types.ObjectId, ref: 'Problem' }],
}, { timestamps: true });

export default mongoose.model('User', UserSchema);