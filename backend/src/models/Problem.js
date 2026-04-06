import mongoose, { Schema } from 'mongoose';


















const ProblemSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  description: { type: String, required: true },
  tags: [{ type: String }],
  codeSnippets: { type: Schema.Types.Mixed }, // maps language to starter code
  metaData: { type: Schema.Types.Mixed }, // stores function name, param types, etc.
  testCases: [{
    input: { type: Schema.Types.Mixed, required: true },
    expectedOutput: { type: Schema.Types.Mixed, required: true },
    isHidden: { type: Boolean, default: false },
    ignoreOrder: { type: Boolean, default: false }
  }],
  // 3-tier progressive hints system
  hints: [{
    level: { type: Number, enum: [1, 2, 3], required: true }, // 1=conceptual, 2=approach, 3=near-solution
    text: { type: String, required: true },
    xpCost: { type: Number, default: 5 } // XP penalty for revealing
  }],
  // Acceptance rate tracking
  totalAttempts: { type: Number, default: 0 },
  totalAccepted: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Problem', ProblemSchema);