import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    senderId: string;
    receiverId: string;
    text: string;
    timestamp: Date;
    isRead: boolean;
    // New Media Fields
    mediaType?: 'image' | 'video' | 'file';
    mediaData?: string; // Base64 or URL
    fileName?: string;
    viewMode?: 'once' | 'unlimited';
    isLocked?: boolean; // For receiver privacy toggle
    viewCount?: number;
    viewedBy?: string[]; // Track who viewed (for multi-user/future proofing)
}

const MessageSchema: Schema = new Schema({
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    text: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },

    // Media & Privacy
    mediaType: { type: String, enum: ['image', 'video', 'file'], default: null },
    mediaData: { type: String, default: null },
    fileName: { type: String, default: null },
    viewMode: { type: String, enum: ['once', 'unlimited'], default: 'unlimited' },
    isLocked: { type: Boolean, default: false }, // Receiver can toggle independent of mode
    viewCount: { type: Number, default: 0 },
    viewedBy: [{ type: String }]
});

// Prevent OverwriteModelError
export const MessageModel = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
