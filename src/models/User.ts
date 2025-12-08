
/* 
   ============================================================
   FRONTEND USER MODEL (Interfaces Only)
   ============================================================
   NOTE: This file is for Frontend usage only. 
   Do NOT import 'mongoose' here as it breaks the client build.
*/

export const PROFESSION_TYPES = [
    "Student",
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
    "Musician",
    "Singer",
    "Artist",
    "Actor",
    "Architect",
    "Civil Engineer",
    "Mechanical Engineer",
    "Electrical Engineer",
    "Technician",
    "Mechanic",
    "Carpenter",
    "Plumber",
    "Electrician",
    "Chef",
    "Cook",
    "Barista",
    "Waiter",
    "Sales Executive",
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
    "Customer Support",
    "Delivery Rider",
    "Driver",
    "Nurse",
    "Doctor",
    "Medical Student",
    "Pharmacist",
    "Therapist",
    "Lab Technician",
    "Fitness Trainer",
    "Athlete",
    "Coach",
    "Model",
    "Social Worker",
    "Teacher",
    "Professor",
    "Researcher",
    "Scientist",
    "Unemployed",
    "Looking for Opportunities",
    "Homemaker"
] as const;

export interface IUserProfession {
    type: typeof PROFESSION_TYPES[number];

    // Only used when relevant:
    university?: string;       // Student
    company?: string;          // Corporate / Engineering / Tech
    hospital?: string;         // Medical fields
    occupationPlace?: string;  // General fallback for unknown
}

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
    profession?: IUserProfession;
    isVerified: boolean;
    category?: string;

    // Social metrics
    followers: string[];
    following: string[];
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
    university?: string; // Kept for flexible compatibility but moved to profession in primary use
    interests?: string[];
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

        region?: string[];
        languages?: string[];
        languageCountries?: string[];
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
