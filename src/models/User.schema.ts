import mongoose, { Schema, Document, Model } from "mongoose";

// Profession types enum (define here to avoid circular imports)
export const PROFESSION_TYPES = [
    "Student",
    "Medical Student",
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
    "Self-Employed",
    "Doctor",
    "Nurse",
    "Therapist",
    "Pharmacist",
    "Lab Technician",
    "Unemployed",
    "Looking for Opportunities",
    "Homemaker"
] as const;

export interface IProfession {
    type: string;
    university?: string;
    company?: string;
    hospital?: string;
    occupationPlace?: string;
}

export interface IUser {
    email: string;
    password: string;
    privateId: string;

    displayName?: string;
    username?: string;
    phone?: string;

    avatarUrl?: string;
    coverPhotoUrl?: string;

    bio?: string;
    website?: string;

    profession?: IProfession;

    isVerified?: boolean;
    category?: string;

    followers?: number;
    following?: number;

    friends?: any[]; // Array of User IDs

    connectedAccounts?: {
        youtube: {
            connected: boolean;
            token?: string;
            channelId?: string;
        };
        instagram: {
            connected: boolean;
            token?: string;
            accountId?: string;
        };
    };

    gender?: string;
    age?: number;
    country?: string;

    interests?: string[];
    theme?: "light" | "dark";

    status?: string;
    lastActive?: number;

    // Complex fields omitted for brevity but still in schema
}

// Extend Mongoose Document
export interface UserDocument extends IUser, Document { }


// ------------------------
// Profession Subschema
// ------------------------
const ProfessionSchema = new Schema<IProfession>(
    {
        type: {
            type: String,
            enum: PROFESSION_TYPES,
            required: true
        },

        university: {
            type: String,
            required: function (this: IProfession) {
                return this.type === "Student" || this.type === "Medical Student";
            }
        },

        company: {
            type: String,
            required: function (this: IProfession) {
                return [
                    "Software Engineer", "Full-Stack Developer", "Backend Developer", "Frontend Developer",
                    "Mobile Developer", "Game Developer", "AI Engineer", "ML Engineer", "Data Analyst",
                    "Data Scientist", "Cybersecurity Analyst", "DevOps Engineer", "Cloud Engineer",
                    "UI/UX Designer", "Product Designer", "Graphic Designer", "Animator", "Video Editor",
                    "Photographer", "Videographer", "Content Creator", "Influencer", "Blogger", "Writer",
                    "Editor", "Architect", "Civil Engineer", "Mechanical Engineer", "Electrical Engineer",
                    "Technician", "Mechanic", "Marketing Specialist", "HR Executive", "Operations Manager",
                    "Accountant", "Banker", "Business Analyst", "Entrepreneur", "Founder",
                    "Freelancer", "Self-Employed"
                ].includes(this.type);
            }
        },

        hospital: {
            type: String,
            required: function (this: IProfession) {
                return [
                    "Doctor", "Nurse", "Medical Student", "Therapist",
                    "Pharmacist", "Lab Technician"
                ].includes(this.type);
            }
        },

        occupationPlace: {
            type: String,
            required: function (this: IProfession) {
                // Not required if type is one of these:
                if (["Unemployed", "Looking for Opportunities", "Homemaker"].includes(this.type)) {
                    return false;
                }
                // Otherwise required if no other place is specified
                return !this.university && !this.company && !this.hospital;
            }
        }
    },
    { _id: false }
);


// ------------------------
// USER SCHEMA
// ------------------------
const UserSchema = new Schema<UserDocument>(
    {
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        privateId: { type: String, required: true, unique: true },

        displayName: String,
        username: { type: String, unique: true, sparse: true },
        phone: String,

        avatarUrl: String,
        coverPhotoUrl: String,

        bio: String,
        website: String,

        profession: { type: ProfessionSchema, default: undefined },

        isVerified: { type: Boolean, default: false },
        category: String,

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
        age: Number,
        country: String,

        interests: [String],
        theme: { type: String, enum: ["light", "dark"], default: "dark" },

        status: { type: String, enum: ["online", "offline", "searching", "in-call"], default: "offline" },
        lastActive: { type: Number, default: Date.now },

        preferences: {
            matchGender: { type: String, enum: ["male", "female", "any"], default: "any" },
            matchRegion: { type: String, enum: ["same-country", "global"], default: "global" },
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

        // Location Tracking
        currentIP: { type: String, select: false }, // Don't expose IP by default
        currentLocation: {
            city: String,
            region: String,
            country: String,
            lat: Number,
            lon: Number,
            timezone: String,
            ip: String
        },
        signupLocation: {
            city: String,
            region: String,
            country: String,
            lat: Number,
            lon: Number,
            timezone: String,
            ip: String
        }

    },
    { timestamps: true }
);


// ------------------------
// MODEL EXPORT
// ------------------------
export const UserModel =
    mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);
