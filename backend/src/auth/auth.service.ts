import { UserModel, IUser } from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export class AuthService {
    async signup(userData: any) {
        const { email, password, displayName, username } = userData;

        // Check if user exists
        const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            throw new Error('User already exists with that email or username');
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
            status: 'online',
            lastActive: Date.now()
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
