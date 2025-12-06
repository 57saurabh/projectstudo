import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Loop from '@/models/Loop';
import { UserModel as User } from '@/models/User.schema';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// Helper to get user ID from token
const getUserId = (req: Request) => {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded: any = jwt.verify(token, JWT_SECRET);
            return decoded.id;
        } catch {
            return null;
        }
    }
    return null;
};

export async function GET() {
    await connectDB();
    try {
        const loops = await Loop.find()
            .populate('userId', 'displayName username avatarUrl')
            .sort({ createdAt: -1 })
            .limit(20);
        return NextResponse.json(loops);
    } catch (error) {
        return NextResponse.json({ message: 'Failed to fetch loops' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    await connectDB();
    try {
        const userId = getUserId(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { mediaUrl, type, caption } = body;

        if (!mediaUrl) {
            return NextResponse.json({ message: 'Media URL is required' }, { status: 400 });
        }

        const newLoop = await Loop.create({
            userId,
            mediaUrl,
            type,
            caption
        });

        return NextResponse.json(newLoop, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: 'Failed to create loop' }, { status: 500 });
    }
}
