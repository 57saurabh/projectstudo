import mongoose, { Schema, Document } from 'mongoose';
import { LiveDestinationSchema, ILiveDestination } from './LiveDestination';

export interface ILiveSession extends Document {
    host: mongoose.Types.ObjectId;
    type: 'random' | 'friend' | 'group' | 'broadcast';
    status: 'idle' | 'configuring' | 'connecting' | 'live' | 'stopping' | 'ended' | 'error';
    platforms: string[];
    activeCallId?: string;
    destinations: ILiveDestination[];
    title?: string;
    description?: string;
    startedAt?: Date;
    endedAt?: Date;
}

const LiveSessionSchema: Schema = new Schema({
    host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['random', 'friend', 'group', 'broadcast'], required: true },
    status: {
        type: String,
        enum: ['idle', 'configuring', 'connecting', 'live', 'stopping', 'ended', 'error'],
        default: 'idle'
    },
    platforms: [{ type: String, enum: ['internal', 'youtube', 'instagram'] }],
    activeCallId: { type: String },
    destinations: [LiveDestinationSchema],
    title: { type: String },
    description: { type: String },
    startedAt: { type: Date },
    endedAt: { type: Date }
}, { timestamps: true });

export const LiveSessionModel = mongoose.models.LiveSession || mongoose.model<ILiveSession>('LiveSession', LiveSessionSchema);
