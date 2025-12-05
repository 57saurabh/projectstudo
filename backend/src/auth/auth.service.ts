import { UserModel, IUser } from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { generateHumorousUsername } from '../utils/usernameGenerator';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export class AuthService {
    async signup(userData: any) {
        const { email, password, displayName } = userData;

        // Check if user exists by email
        const existingEmail = await UserModel.findOne({ email });
        if (existingEmail) {
            throw new Error('Email is already registered');
        }

        // Auto-generate Unique Username
        let username = userData.username;

        // Always generate a new unique username as per requirement
        // "every time when user create always create new unique and humaruos username"
        let isUnique = false;
        while (!isUnique) {
            username = generateHumorousUsername();
            const existing = await UserModel.findOne({ username });
            if (!existing) {
                isUnique = true;
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = new UserModel({
            email,
            password: hashedPassword,
            displayName: displayName || username,
            username,
            privateId: uuidv4(),

            // Profile Defaults
            status: 'online',
            lastActive: Date.now(),
            bio: '',
            website: '',
            profession: { type: 'Looking for Opportunities' },
            isVerified: false,

            // Location & Demographics
            country: '',
            gender: 'male', // Default or handle optional
            age: 18, // Default

            // Social Graph
            followers: 0,
            following: 0,
            friends: [],
            blockedUsers: [],
            mutedUsers: [],

            // Content
            stories: [],
            highlights: [],
            savedStories: [],

            // Connected Accounts
            connectedAccounts: {
                youtube: { connected: false },
                instagram: { connected: false }
            },

            // Insights
            insights: {
                profileVisits: 0,
                reach: 0,
                impressions: 0,
                engagementRate: 0
            },

            // Privacy Settings
            privacy: {
                isPrivate: false,
                allowMessagesFrom: "everyone",
                allowStoryRepliesFrom: "everyone",
                allowTagging: "everyone",
                twoFactorEnabled: false
            },

            // User Interests
            interests: [],

            // Preferences
            preferences: {
                matchGender: "any",
                matchRegion: "global",
                region: [],
                languages: [],
                languageCountries: []
            },

            // Live Connection
            connection: {
                isCameraOn: false,
                isMicOn: false
            },

            // Reports
            reports: {
                count: 0,
                reasons: []
            },

            // System
            theme: 'dark',
            isBanned: false,
            reputationScore: 100
        });

        await newUser.save();

        // Generate Token
        const token = this.generateToken(newUser);

        return { user: newUser, token };
    }

    async login(credentials: any) {
        const { email, password } = credentials;

        // Find user
        const user = await UserModel.findOne({ email });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check password
        if (!user.password) {
            throw new Error('Invalid credentials');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        // Update status
        user.status = 'online';
        user.lastActive = Date.now();
        await user.save();

        // Generate Token
        const token = this.generateToken(user);

        return { user, token };
    }

    private generateToken(user: any) {
        return jwt.sign(
            { id: user._id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
    }
}
