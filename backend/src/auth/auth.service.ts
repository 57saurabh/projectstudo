import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { User } from '../user/user.model';

export class AuthService {
    private secretKey = process.env.JWT_SECRET || 'super-secret-key';

    async signup(data: any) {
        const { email, password, displayName } = data;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            email,
            password: hashedPassword,
            displayName,
            privateId: uuidv4().slice(0, 8),
            reputationScore: 100,
        });

        const token = this.generateToken(user);
        return { user, token };
    }

    async login(data: any) {
        const { email, password } = data;

        const user = await User.findOne({ email });
        if (!user || !user.password) {
            throw new Error('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken(user);
        return { user, token };
    }

    generateToken(user: any) {
        return jwt.sign(
            { id: user._id, email: user.email },
            this.secretKey,
            { expiresIn: '7d' }
        );
    }

    verifyToken(token: string) {
        try {
            return jwt.verify(token, this.secretKey);
        } catch (error) {
            return null;
        }
    }
}
