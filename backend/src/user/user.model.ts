import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    password?: string;
    privateId: string;
    displayName?: string;
    reputationScore: number;
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    privateId: { type: String, required: true, unique: true },
    displayName: { type: String },
    reputationScore: { type: Number, default: 100 },
    createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', UserSchema);
