import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivity extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'live' | 'post' | 'profile_update' | 'signup' | 'friend_request';
    description: string;
    metadata?: any; // For extra data like loopId, friendId, etc.
    createdAt: Date;
}

const ActivitySchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['live', 'post', 'profile_update', 'signup', 'friend_request'],
        required: true
    },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
});

const Activity: Model<IActivity> = mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);

export default Activity;
