import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { FriendRequestModel } from '@/models/FriendRequest';
import jwt from 'jsonwebtoken';
import { UserModel as User } from '@/models/User.schema'; // Import for population if needed

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

        const requests = await FriendRequestModel.find({
            receiver: currentUserId,
            status: 'pending'
        }).populate('sender', 'displayName username avatarUrl');

        return NextResponse.json(requests);

    } catch (error) {
        console.error('Fetch requests error:', error);
        return NextResponse.json({ message: 'Failed to fetch requests' }, { status: 500 });
    }
}
