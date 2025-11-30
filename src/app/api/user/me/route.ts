import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { UserModel as User } from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export async function GET(req: Request) {
    try {
        await dbConnect();

        // 1. Try to get token from Authorization header
        const authHeader = req.headers.get('authorization');
        let userId = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded: any = jwt.verify(token, JWT_SECRET);
                userId = decoded.id;
            } catch (err) {
                return NextResponse.json(
                    { message: 'Invalid or expired token' },
                    { status: 401 }
                );
            }
        } else {
            // 2. Fallback to x-user-id (for dev/testing if needed, or remove if strict)
            // Keeping it for backward compatibility with existing code if any
            userId = req.headers.get('x-user-id');
        }

        if (!userId) {
            return NextResponse.json(
                { message: 'Unauthorized: Missing Token or User ID' },
                { status: 401 }
            );
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        // Return user data (exclude password)
        const userData = user.toObject();
        delete userData.password;

        return NextResponse.json(userData, { status: 200 });

    } catch (error: any) {
        console.error('Get User error:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to fetch user' },
            { status: 500 }
        );
    }
}
