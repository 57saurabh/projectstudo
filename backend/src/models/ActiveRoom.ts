import mongoose, { Schema, Document } from 'mongoose';

export interface IActiveRoom extends Document {
    roomId: string;
    participants: string[]; // List of socketIds
    createdAt: Date;
}

const ActiveRoomSchema = new Schema<IActiveRoom>({
    roomId: { type: String, required: true, unique: true, index: true },
    participants: [{ type: String }],
    createdAt: { type: Date, default: Date.now, expires: 86400 } // Safety TTL 24h
});

export const ActiveRoom = mongoose.model<IActiveRoom>('ActiveRoom', ActiveRoomSchema);
