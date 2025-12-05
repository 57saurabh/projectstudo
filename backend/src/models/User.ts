import mongoose, { Schema, Document, Model } from "mongoose";

/* ============================================================
   1. STRONG TYPESCRIPT INTERFACES
   ============================================================ */

export interface IProfession {
    title: string;
    company?: string;
    university?: string;
}

export interface IConnectedAccount {
    connected: boolean;
    token?: string;
    channelId?: string;
    accountId?: string;
}

export interface IStory {
    id: string;
    mediaUrl: string;
    caption?: string;
    views: number;
    createdAt: number;
    expiresAt: number;
}

export interface IHighlight {
    id: string;
    title: string;
    coverImageUrl: string;
    storyIds: string[];
    createdAt: number;
}

export interface IUserPrivacy {
    isPrivate: boolean;
    allowMessagesFrom: "everyone" | "followers" | "none";
    allowStoryRepliesFrom: "everyone" | "followers" | "none";
    allowTagging: "everyone" | "followers" | "none";
    twoFactorEnabled: boolean;
}

export interface IUserInsights {
    profileVisits: number;
    reach: number;
    impressions: number;
    engagementRate?: number;
}

export interface IUserPreferences {
    matchGender?: "male" | "female" | "any";
    matchRegion?: "same-country" | "global";
    minAge?: number;
    maxAge?: number;

    // Moved from top-level
    region?: string[];
    languages?: string[];
    languageCountries?: string[];
}

export interface IUserConnection {
    socketId?: string;
    roomId?: string;
    isCameraOn: boolean;
    isMicOn: boolean;
}

export interface IUserReports {
    count: number;
    reasons: string[];
}

/* ============================================================
   2. MAIN USER INTERFACE
   ============================================================ */

export interface IUser {
    _id: string;
    email: string;
    password?: string;

    privateId: string;
    displayName?: string;
    username?: string;
    phone?: string;

    avatarUrl?: string;
    coverPhotoUrl?: string;

    bio: string;
    website: string;
    profession: IProfession;
    isVerified: boolean;
    category?: string;

    followers: number;
    following: number;
    friends: string[];

    connectedAccounts: {
        youtube: IConnectedAccount;
        instagram: IConnectedAccount;
    };

    stories: IStory[];
    highlights: IHighlight[];

    blockedUsers: string[];
    mutedUsers: string[];
    savedStories: string[];

    insights: IUserInsights;

    privacy: IUserPrivacy;

    gender?: "male" | "female" | "other";
    age?: number;
    country?: string;
    university?: string; // Kept for backward compat or maybe remove? Schema has it inside profession now for students? prompt says "if user select student then option for university will come". I'll put it in IProfession. Removing from top level to avoid confusion.

    interests: string[];
    // languages removed
    // languageCountries removed
    // language single removed? Prompt said "move language, region". I will move plural ones. The single 'language' might be UI language? I'll move plural ones as per context `preferences`.

    theme: "light" | "dark";

    status: "online" | "offline" | "searching" | "in-call";
    lastActive: number;

    preferences: IUserPreferences;

    connection: IUserConnection;

    reports: IUserReports;

    isBanned: boolean;
    reputationScore: number;

    createdAt: Date | string;
    updatedAt: Date | string;
}

/* ============================================================
   3. MONGOOSE DOCUMENT INTERFACE
   ============================================================ */

export interface UserDocument extends IUser, Document {
    _id: any;
}

/* ============================================================
   4. MONGOOSE SCHEMA
   ============================================================ */

const UserSchema = new Schema<UserDocument>(
    {
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },

        privateId: { type: String, required: true, unique: true },
        displayName: { type: String },
        username: { type: String, unique: true, sparse: true },
        phone: { type: String },

        avatarUrl: { type: String },
        coverPhotoUrl: { type: String },

        bio: { type: String, default: "" },
        website: { type: String, default: "" },
        profession: {
            title: { type: String, default: "" },
            company: { type: String },
            university: { type: String }
        },
        isVerified: { type: Boolean, default: false },
        category: { type: String },

        followers: { type: Number, default: 0 },
        following: { type: Number, default: 0 },

        friends: [{ type: Schema.Types.ObjectId, ref: "User" }],

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

        stories: [
            {
                id: String,
                mediaUrl: String,
                caption: String,
                views: { type: Number, default: 0 },
                createdAt: Number,
                expiresAt: Number
            }
        ],

        highlights: [
            {
                id: String,
                title: String,
                coverImageUrl: String,
                storyIds: [String],
                createdAt: Number
            }
        ],

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
            allowMessagesFrom: {
                type: String,
                enum: ["everyone", "followers", "none"],
                default: "everyone"
            },
            allowStoryRepliesFrom: {
                type: String,
                enum: ["everyone", "followers", "none"],
                default: "everyone"
            },
            allowTagging: {
                type: String,
                enum: ["everyone", "followers", "none"],
                default: "everyone"
            },
            twoFactorEnabled: { type: Boolean, default: false }
        },

        gender: { type: String, enum: ["male", "female", "other"] },
        age: Number,
        country: String,
        // region removed
        // university removed (moved to profession)

        interests: { type: [String], default: [] },
        // languages removed
        // languageCountries removed

        theme: { type: String, enum: ["light", "dark"], default: "dark" },

        status: {
            type: String,
            enum: ["online", "offline", "searching", "in-call"],
            default: "offline"
        },

        lastActive: { type: Number, default: Date.now },

        preferences: {
            matchGender: {
                type: String,
                enum: ["male", "female", "any"],
                default: "any"
            },
            matchRegion: {
                type: String,
                enum: ["same-country", "global"],
                default: "global"
            },
            minAge: Number,
            maxAge: Number,

            region: { type: [String], default: [] },
            languages: { type: [String], default: [] },
            languageCountries: { type: [String], default: [] }
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
    },
    { timestamps: true }
);

/* ============================================================
   5. EXPORT MODEL
   ============================================================ */

export const UserModel: Model<UserDocument> =
    mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);
