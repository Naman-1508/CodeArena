import mongoose, { Schema } from 'mongoose';













const InterviewSchema = new Schema({
  interviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  candidateId: { type: Schema.Types.ObjectId, ref: 'User' },
  problemId: { type: Schema.Types.ObjectId, ref: 'Problem' },
  status: { type: String, enum: ['Scheduled', 'Active', 'Completed'], default: 'Scheduled' },
  roomToken: { type: String, required: true, unique: true },
  report: { type: String },
  startedAt: { type: Date },
  endedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('Interview', InterviewSchema);