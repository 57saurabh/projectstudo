import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    senderId: string;
    receiverId: string;
    text: string; // Encrypted content
    timestamp: Date;
    isRead: boolean;
}

const MessageSchema: Schema = new Schema({
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
});

// Prevent OverwriteModelError
export const MessageModel = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
