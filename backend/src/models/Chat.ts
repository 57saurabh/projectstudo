import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChat extends Document {
    participants: string[];
    createdAt: Date;
    updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
    {
        participants: [{ type: String, required: true }],
    },
    { timestamps: true }
);

// Index for finding chats by participant
ChatSchema.index({ participants: 1 });

export const ChatModel: Model<IChat> =
    mongoose.models.Chat || mongoose.model<IChat>("Chat", ChatSchema);
