import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
    chatId: string;
    senderId: string;
    receiverId: string;
    text: string;
    type: 'text' | 'image' | 'video';
    mediaData?: string;
    fileUrl?: string;
    timestamp: Date;
    status: 'sent' | 'delivered' | 'seen';
    isRead: boolean; // Deprecated, use status
}

const MessageSchema = new Schema<IMessage>(
    {
        chatId: { type: String, required: true, index: true }, // References Chat._id
        senderId: { type: String, required: true },
        receiverId: { type: String, required: true },
        text: { type: String, default: '' },
        type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
        mediaData: { type: String },
        fileUrl: { type: String }, // For S3/Cloudinary URLs if needed
        timestamp: { type: Date, default: Date.now },
        status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
        isRead: { type: Boolean, default: false }
    },
    { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

export const MessageModel: Model<IMessage> =
    mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
