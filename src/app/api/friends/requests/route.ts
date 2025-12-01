import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { FriendRequestModel as FriendRequest } from '@backend/src/models/FriendRequest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

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

// GET: List pending requests (incoming)
export async function GET(req: Request) {
    try {
        await dbConnect();
        const userId = getUserId(req);
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const requests = await FriendRequest.find({ receiver: userId, status: 'pending' })
            .populate('sender', 'displayName username avatarUrl');

        return NextResponse.json(requests, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
