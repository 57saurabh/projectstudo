import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFriendship extends Document {
    userId: string;
    friendId: string;
    createdAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
    {
        userId: { type: String, required: true },
        friendId: { type: String, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index to ensure uniqueness and fast lookup
FriendshipSchema.index({ userId: 1, friendId: 1 }, { unique: true });
FriendshipSchema.index({ friendId: 1, userId: 1 }); // unique not needed here if bidirectional handled by creating two docs or checking both ways.
// NOTE: "Stores bidirectional friendship". Usually means either [A, B] single doc, or A->B and B->A.
// The prompt says "{ userId, friendId, createdAt }".
// To simplify queries "am I friends with X", it's often easier to store 2 docs OR 1 doc with participants array.
// But the prompt specified keys: userId, friendId.
// I will assume TWO documents are created for bidirectional, or the app queries `{ $or: [ { userId: A, friendId: B }, { userId: B, friendId: A } ] }`.
// I will index for efficient querying.

export const FriendshipModel: Model<IFriendship> =
    mongoose.models.Friendship || mongoose.model<IFriendship>("Friendship", FriendshipSchema);
