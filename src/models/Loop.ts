import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILoop extends Document {
    userId: mongoose.Types.ObjectId;
    mediaUrl: string;
    type: 'image' | 'video';
    caption?: string;
    views: number;
    createdAt: Date;
    expiresAt: Date;
}

const LoopSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mediaUrl: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    caption: { type: String },
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(+new Date() + 24 * 60 * 60 * 1000) } // 24 hours
});

// Index for auto-deletion after expiry
LoopSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Loop: Model<ILoop> = mongoose.models.Loop || mongoose.model<ILoop>('Loop', LoopSchema);

export default Loop;
