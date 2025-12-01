import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { UserModel } from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Verify token
        jwt.verify(token, JWT_SECRET);

        const user = await UserModel.findById(params.userId).select('displayName username avatarUrl bio country language isVerified');

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);

    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
