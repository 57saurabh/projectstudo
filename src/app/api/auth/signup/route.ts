import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { UserModel as User } from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export async function POST(req: Request) {
    try {
        await dbConnect();

        const { email, password, displayName } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email and password are required' },
                { status: 400 }
            );
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { message: 'User already exists' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const privateId = uuidv4().slice(0, 8);
        const generatedUsername = `user_${privateId}`;

        const user = await User.create({
            email,
            password: hashedPassword,
            displayName: displayName || generatedUsername,
            username: generatedUsername,
            privateId,
            reputationScore: 100,
        });

        const token = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return NextResponse.json({ user, token }, { status: 201 });

    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { message: error.message || 'Signup failed' },
            { status: 500 }
        );
    }
}
