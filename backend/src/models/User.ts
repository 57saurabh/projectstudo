import mongoose, { Schema, Document, Model } from 'mongoose';

// Plain interface for frontend and general use
export interface IUser {
    _id: string;
    id?: string; // For backward compatibility
    email: string;
    privateId: string;
    displayName?: string;
    username?: string;
    phone?: string;

    // Profile visuals
    avatarUrl?: string;
    coverPhotoUrl?: string;

    // Social-style profile
    bio?: string;
    website?: string;
    profession?: string;
    isVerified: boolean;
    category?: string;

    // Social metrics
    followers: number;
    following: number;
    friends: string[]; // Array of User IDs
    connectedAccounts: {
        youtube?: { connected: boolean; token?: string; channelId?: string };
        instagram?: { connected: boolean; token?: string; accountId?: string };
    };

    // Story system
    stories: Array<{
        id: string;
        mediaUrl: string;
        caption?: string;
        views: number;
        createdAt: number;
        expiresAt: number;
    }>;

    // Highlights
    highlights: Array<{
        id: string;
        title: string;
        coverImageUrl: string;
        storyIds: string[];
        createdAt: number;
    }>;

    // User interaction
    blockedUsers: string[];
    mutedUsers: string[];
    savedStories: string[];

    // Insights
    insights: {
        profileVisits: number;
        reach: number;
        impressions: number;
        engagementRate?: number;
    };

    // Privacy
    privacy: {
        isPrivate: boolean;
        allowMessagesFrom: "everyone" | "followers" | "none";
        allowStoryRepliesFrom: "everyone" | "followers" | "none";
        allowTagging: "everyone" | "followers" | "none";
        twoFactorEnabled: boolean;
    };

    // Demographics
    gender?: "male" | "female" | "other";
    age?: number;
    country?: string;
    region?: string; // For UI consistency, though we might map to country
    university?: string;
    interests?: string[];
    languages?: string[];
    languageCountries?: string[]; // For UI persistence of selected flags
    language?: string; // Keep for backward compatibility or primary language
    theme?: 'light' | 'dark';

    // Status
    status: "online" | "offline" | "searching" | "in-call";
    lastActive: number;

    // Match preferences
    preferences: {
        matchGender?: "male" | "female" | "any";
        matchRegion?: "same-country" | "global";
        minAge?: number;
        maxAge?: number;
    };

    // Connection info
    connection: {
        socketId?: string;
        roomId?: string;
        isCameraOn: boolean;
        isMicOn: boolean;
    };

    // Moderation
    reports: {
        count: number;
        reasons: string[];
    };

    // Account restrictions
    isBanned: boolean;

    reputationScore: number;
    createdAt: string | Date;
    updatedAt: string | Date;
}

// Mongoose Document interface
export interface UserDocument extends Omit<IUser, '_id'>, Document {
    _id: any; // Override to allow string or ObjectId
}

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    privateId: { type: String, required: true, unique: true },
    displayName: { type: String },
    username: { type: String, unique: true, sparse: true },
    phone: { type: String },

    avatarUrl: { type: String },
    coverPhotoUrl: { type: String },

    bio: { type: String },
    website: { type: String },
    profession: { type: String },
    isVerified: { type: Boolean, default: false },
    category: { type: String },

    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    connectedAccounts: {
        youtube: {
            connected: { type: Boolean, default: false },
            token: String,
            channelId: String
        },
        instagram: {
            connected: { type: Boolean, default: false },
            token: String,
            accountId: String
        }
    },

    stories: [{
        id: String,
        mediaUrl: String,
        caption: String,
        views: { type: Number, default: 0 },
        createdAt: Number,
        expiresAt: Number
    }],

    highlights: [{
        id: String,
        title: String,
        coverImageUrl: String,
        storyIds: [String],
        createdAt: Number
    }],

    blockedUsers: [String],
    mutedUsers: [String],
    savedStories: [String],

    insights: {
        profileVisits: { type: Number, default: 0 },
        reach: { type: Number, default: 0 },
        impressions: { type: Number, default: 0 },
        engagementRate: { type: Number, default: 0 }
    },

    privacy: {
        isPrivate: { type: Boolean, default: false },
        allowMessagesFrom: { type: String, enum: ["everyone", "followers", "none"], default: "everyone" },
        allowStoryRepliesFrom: { type: String, enum: ["everyone", "followers", "none"], default: "everyone" },
        allowTagging: { type: String, enum: ["everyone", "followers", "none"], default: "everyone" },
        twoFactorEnabled: { type: Boolean, default: false }
    },

    gender: { type: String, enum: ["male", "female", "other"] },
    age: { type: Number },
    country: { type: String },
    region: [String],
    university: { type: String },
    interests: [String],
    languages: [String],
    languageCountries: [String],
    language: { type: String },
    theme: { type: String, enum: ['light', 'dark'], default: 'dark' },

    status: { type: String, enum: ["online", "offline", "searching", "in-call"], default: "offline" },
    lastActive: { type: Number, default: Date.now },

    preferences: {
        matchGender: { type: String, enum: ["male", "female", "any"], default: "any" },
        matchRegion: { type: String, enum: ["same-country", "global"], default: "global" },
        minAge: { type: Number },
        maxAge: { type: Number }
    },

    connection: {
        socketId: String,
        roomId: String,
        isCameraOn: { type: Boolean, default: false },
        isMicOn: { type: Boolean, default: false }
    },

    reports: {
        count: { type: Number, default: 0 },
        reasons: [String]
    },

    isBanned: { type: Boolean, default: false },

    reputationScore: { type: Number, default: 100 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Check if the model is already defined to prevent OverwriteModelError
export const UserModel = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
