import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { UserModel as User } from '@/models/User';
import { FriendRequestModel as FriendRequest } from '@backend/src/models/FriendRequest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// Helper to get authenticated user ID
const getUserId = (req: Request) => {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded: any = jwt.verify(token, JWT_SECRET);
            return decoded.id;
        } catch (err) {
            return null;
        }
    }
    return req.headers.get('x-user-id');
};

// GET: List friends
export async function GET(req: Request) {
    try {
        await dbConnect();
        const userId = getUserId(req);
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const user = await User.findById(userId).populate('friends', 'displayName username avatarUrl status');
        if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

        return NextResponse.json(user.friends, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// POST: Send friend request
export async function POST(req: Request) {
    try {
        await dbConnect();
        const userId = getUserId(req);
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { receiverId } = await req.json();
        if (!receiverId) return NextResponse.json({ message: 'Receiver ID required' }, { status: 400 });

        if (userId === receiverId) return NextResponse.json({ message: 'Cannot add yourself' }, { status: 400 });

        // Check if already friends
        const user = await User.findById(userId);
        if (user.friends.includes(receiverId)) {
            return NextResponse.json({ message: 'Already friends' }, { status: 400 });
        }

        // Check if request already exists
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: userId, receiver: receiverId },
                { sender: receiverId, receiver: userId }
            ],
            status: 'pending'
        });

        if (existingRequest) {
            return NextResponse.json({ message: 'Request already pending' }, { status: 400 });
        }

        const newRequest = await FriendRequest.create({
            sender: userId,
            receiver: receiverId,
            status: 'pending'
        });

        return NextResponse.json(newRequest, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
