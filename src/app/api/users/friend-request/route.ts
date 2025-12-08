import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { UserModel as User } from '@/models/User.schema';
import { FriendRequestModel } from '@/models/FriendRequest';
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

export async function POST(req: Request) {
    await connectDB();
    try {
        const currentUserId = getUserId(req);
        if (!currentUserId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { targetUserId, action } = await req.json();

        if (!targetUserId) {
            return NextResponse.json({ message: 'Target user ID required' }, { status: 400 });
        }

        if (currentUserId === targetUserId) {
            return NextResponse.json({ message: 'Cannot add yourself' }, { status: 400 });
        }

        if (action === 'send') {
            // Check if already friends
            const currentUser = await User.findById(currentUserId);
            if (currentUser.friends.includes(targetUserId)) {
                return NextResponse.json({ message: 'Already friends' }, { status: 400 });
            }

            // Check if request already exists
            const existingRequest = await FriendRequestModel.findOne({
                $or: [
                    { sender: currentUserId, receiver: targetUserId },
                    { sender: targetUserId, receiver: currentUserId }
                ],
                status: 'pending'
            });

            if (existingRequest) {
                return NextResponse.json({ message: 'Friend request already pending' }, { status: 400 });
            }

            // Create new request
            await FriendRequestModel.create({
                sender: currentUserId,
                receiver: targetUserId,
                status: 'pending'
            });

            return NextResponse.json({ message: 'Friend request sent', status: 'requested' });
        }

        if (action === 'cancel') {
            const request = await FriendRequestModel.findOneAndDelete({
                sender: currentUserId,
                receiver: targetUserId,
                status: 'pending'
            });

            if (!request) {
                return NextResponse.json({ message: 'No pending request found' }, { status: 404 });
            }

            return NextResponse.json({ message: 'Friend request cancelled', status: 'none' });
        }

        return NextResponse.json({ message: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Friend request error:', error);
        return NextResponse.json({ message: 'Operation failed' }, { status: 500 });
    }
}
