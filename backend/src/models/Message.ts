import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
    chatId: string;
    senderId: string;
    receiverId: string;
    text: string;
    type: 'text' | 'image' | 'video' | 'file';
    mediaData?: string;
    fileName?: string;
    fileUrl?: string;
    timestamp: Date;
    status: 'sent' | 'delivered' | 'seen';
    isRead: boolean; // Deprecated, use status

    // Media & Privacy Extensions
    mediaType?: 'image' | 'video' | 'file'; // explicit media type if 'type' is ambiguous or for consistency
    viewMode?: 'once' | 'unlimited';
    isLocked?: boolean;
    viewCount?: number;
    viewedBy?: string[];
}

const MessageSchema = new Schema<IMessage>(
    {
        chatId: { type: String, required: true, index: true }, // References Chat._id
        senderId: { type: String, required: true },
        receiverId: { type: String, required: true },
        text: { type: String, default: '' },
        type: { type: String, enum: ['text', 'image', 'video', 'file'], default: 'text' },
        mediaData: { type: String },
        fileName: { type: String },
        fileUrl: { type: String }, // For S3/Cloudinary URLs if needed
        timestamp: { type: Date, default: Date.now },
        status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
        isRead: { type: Boolean, default: false },

        // Media & Privacy
        mediaType: { type: String, enum: ['image', 'video', 'file'], default: null },
        viewMode: { type: String, enum: ['once', 'unlimited'], default: 'unlimited' },
        isLocked: { type: Boolean, default: false },
        viewCount: { type: Number, default: 0 },
        viewedBy: [{ type: String }]
    },
    { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

export const MessageModel: Model<IMessage> =
    mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
