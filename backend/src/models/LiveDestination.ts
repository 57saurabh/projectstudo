import mongoose, { Schema, Document } from 'mongoose';

export interface ILiveDestination extends Document {
    platform: 'internal' | 'youtube' | 'instagram';
    url: string;
    key: string;
    status: 'connecting' | 'live' | 'failed';
    externalId?: string;
}

export const LiveDestinationSchema: Schema = new Schema({
    platform: { type: String, enum: ['internal', 'youtube', 'instagram'], required: true },
    url: { type: String, required: true },
    key: { type: String, required: true },
    status: { type: String, enum: ['connecting', 'live', 'failed'], default: 'connecting' },
    externalId: { type: String }
}, { _id: false });
