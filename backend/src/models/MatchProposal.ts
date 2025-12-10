import mongoose, { Schema, Document } from 'mongoose';

export interface IMatchProposal extends Document {
    proposalId: string;
    roomId: string;
    participants: string[];
    votes: Map<string, string>; // socketId -> 'accept' | 'skip'
    expiresAt: Date;
    createdAt: Date;
}

const MatchProposalSchema = new Schema<IMatchProposal>({
    proposalId: { type: String, required: true, unique: true, index: true },
    roomId: { type: String, required: true },
    participants: [{ type: String }],
    votes: { type: Map, of: String, default: {} },
    expiresAt: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: Date.now, expires: 120 } // Mongo TTL for cleanup (2 mins)
});

// Helper to check validity in logic (since Mongo TTL is imprecise)
MatchProposalSchema.methods.isValid = function () {
    return this.expiresAt.getTime() > Date.now();
};

export const MatchProposal = mongoose.model<IMatchProposal>('MatchProposal', MatchProposalSchema);
