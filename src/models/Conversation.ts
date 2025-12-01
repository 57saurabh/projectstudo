import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
    _id?: string;
    senderId: string;
    receiverId: string;
    text: string;
    timestamp: Date;
    isRead: boolean;
}

export interface IConversation extends Document {
    participants: { userId: string }[];
    messages: IMessage[];
    lastMessage: {
        text: string;
        timestamp: Date;
        senderId: string;
        receiverId: string;
    };
    unreadCount: Map<string, number>;
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema({
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
});

const ConversationSchema = new Schema({
    participants: [{
        userId: { type: String, required: true }
    }],
    messages: [MessageSchema],
    lastMessage: {
        text: String,
        timestamp: Date,
        senderId: String,
        receiverId: String
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: {}
    }
}, { timestamps: true });

ConversationSchema.index({ "participants.userId": 1 });

export const ConversationModel = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
