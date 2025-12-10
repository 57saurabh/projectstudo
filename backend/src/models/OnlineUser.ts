import mongoose, { Schema, Document } from 'mongoose';

export interface IOnlineUser extends Document {
    socketId: string;
    userId?: string; // Optional linkage to registered user
    state: 'ONLINE' | 'BUSY';
    lastHeartbeat: Date;
}

const OnlineUserSchema = new Schema<IOnlineUser>({
    socketId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    state: { type: String, enum: ['ONLINE', 'BUSY'], default: 'ONLINE', index: true },
    lastHeartbeat: { type: Date, default: Date.now, expires: 86400 } // Safety TTL: 24h
});

export const OnlineUser = mongoose.model<IOnlineUser>('OnlineUser', OnlineUserSchema);
