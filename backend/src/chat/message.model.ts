import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    senderId: string;
    receiverId: string;
    text: string; // Encrypted content
    timestamp: Date;
}

const MessageSchema: Schema = new Schema({
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model<IMessage>('Message', MessageSchema);
