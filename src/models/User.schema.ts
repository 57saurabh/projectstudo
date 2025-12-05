import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser, PROFESSION_TYPES } from './User';

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
    profession: {
        type: {
            type: String,
            enum: PROFESSION_TYPES,
            required: true
        },

        university: {
            type: String,
            required: function (this: any) {
                return this.profession?.type === "Student"
                    || this.profession?.type === "Medical Student";
            }
        },

        company: {
            type: String,
            required: function (this: any) {
                return [
                    "Software Engineer",
                    "Full-Stack Developer",
                    "Backend Developer",
                    "Frontend Developer",
                    "Mobile Developer",
                    "Game Developer",
                    "AI Engineer",
                    "ML Engineer",
                    "Data Analyst",
                    "Data Scientist",
                    "Cybersecurity Analyst",
                    "DevOps Engineer",
                    "Cloud Engineer",
                    "UI/UX Designer",
                    "Product Designer",
                    "Graphic Designer",
                    "Animator",
                    "Video Editor",
                    "Photographer",
                    "Videographer",
                    "Content Creator",
                    "Influencer",
                    "Blogger",
                    "Writer",
                    "Editor",
                    "Architect",
                    "Civil Engineer",
                    "Mechanical Engineer",
                    "Electrical Engineer",
                    "Technician",
                    "Mechanic",
                    "Marketing Specialist",
                    "HR Executive",
                    "Operations Manager",
                    "Accountant",
                    "Banker",
                    "Business Analyst",
                    "Entrepreneur",
                    "Founder",
                    "Freelancer",
                    "Self-Employed"
                ].includes(this.profession?.type);
            }
        },

        hospital: {
            type: String,
            required: function (this: any) {
                return [
                    "Doctor",
                    "Nurse",
                    "Medical Student",
                    "Therapist",
                    "Pharmacist",
                    "Lab Technician"
                ].includes(this.profession?.type);
            }
        },

        occupationPlace: {
            type: String,
            required: function (this: any) {
                return !this.university && !this.company && !this.hospital;
            }
        }
    },
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
    // university: { type: String }, // Removed top level from schema to enforce nesting
    interests: [String],
    theme: { type: String, enum: ['light', 'dark'], default: 'dark' },

    status: { type: String, enum: ["online", "offline", "searching", "in-call"], default: "offline" },
    lastActive: { type: Number, default: Date.now },

    preferences: {
        matchGender: { type: String, enum: ["male", "female", "any"], default: "any" },
        matchRegion: { type: String, enum: ["same-country", "global"], default: "global" },
        minAge: { type: Number },
        maxAge: { type: Number },

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
}, { timestamps: true });

// Check if the model is already defined to prevent OverwriteModelError
export const UserModel = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
