import mongoose, { Schema } from 'mongoose';

const ProblemProposalSchema = new Schema({
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 120 },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    description: { type: String, required: true, maxlength: 5000 },
    tags: [{ type: String }],
    exampleInput: { type: String },
    exampleOutput: { type: String },
    status: { type: String, enum: ['Pending', 'Under Review', 'Approved', 'Rejected'], default: 'Pending' },
}, { timestamps: true });

export default mongoose.model('ProblemProposal', ProblemProposalSchema);
