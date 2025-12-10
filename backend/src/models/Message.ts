import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
    chatId: string;
    senderId: string;
    receiverId: string;
    text: string;
    timestamp: Date;
    isRead: boolean;
}

const MessageSchema = new Schema<IMessage>(
    {
        chatId: { type: String, required: true, index: true }, // References Chat._id
        senderId: { type: String, required: true },
        receiverId: { type: String, required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        isRead: { type: Boolean, default: false }
    },
    { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

export const MessageModel: Model<IMessage> =
    mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
