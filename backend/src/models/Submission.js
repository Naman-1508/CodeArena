import mongoose, { Schema } from 'mongoose';
















const SubmissionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true, index: true },
  code: { type: String, required: true },
  language: { type: String, required: true },
  isRun: { type: Boolean, default: false },
  status: { type: String, enum: ['Pending', 'Pass', 'Fail', 'Error'], default: 'Pending' },
  runtimeMs: { type: Number, default: 0 },
  memoryKb: { type: Number, default: 0 },
  jobId: { type: String },
  output: { type: String },
  passedCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  runtimePercentile: { type: Number },
  memoryPercentile: { type: Number },
  // Structured per-test breakdown: exact input/expected/got for each test case
  testResults: { type: Schema.Types.Mixed, default: [] },
}, { timestamps: true });

export default mongoose.model('Submission', SubmissionSchema);