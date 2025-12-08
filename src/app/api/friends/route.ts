import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { UserModel as User } from '@/models/User.schema';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

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

export async function GET(req: Request) {
    await connectDB();
    try {
        const currentUserId = getUserId(req);
        if (!currentUserId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const user = await User.findById(currentUserId).populate('friends', 'displayName username avatarUrl status');

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user.friends || []);

    } catch (error) {
        console.error('Fetch friends error:', error);
        return NextResponse.json({ message: 'Failed to fetch friends' }, { status: 500 });
    }
}
