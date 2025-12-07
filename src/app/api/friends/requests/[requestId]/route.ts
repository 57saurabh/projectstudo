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

export async function PUT(req: Request, props: { params: Promise<{ requestId: string }> }) {
    await connectDB();
    try {
        const params = await props.params;
        const { requestId } = params;

        console.log(`PUT /api/friends/requests/${requestId} hit`);

        const currentUserId = getUserId(req);
        if (!currentUserId) {
            console.log('Unauthorized');
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action } = body;
        console.log('Action:', action, 'User:', currentUserId);

        if (!['accept', 'reject'].includes(action)) {
            return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
        }

        const request = await FriendRequestModel.findOne({
            _id: requestId,
            receiver: currentUserId,
            status: 'pending'
        });

        if (!request) {
            console.log('Request not found or invalid');
            return NextResponse.json({
                message: 'Request not found in DB (DEBUG MODE)',
                debug: { requestId, currentUserId }
            }, { status: 409 });
        }

        if (action === 'accept') {
            request.status = 'accepted';
            await request.save();

            // Add to friends lists (Manual fetch and save to handle legacy schema migration)
            const senderId = request.sender;
            const receiverId = request.receiver;

            const receiver = await User.findById(receiverId);
            const sender = await User.findById(senderId);

            if (receiver) {
                if (!Array.isArray(receiver.friends)) receiver.friends = [];
                if (!Array.isArray(receiver.followers)) receiver.followers = [];
                if (!Array.isArray(receiver.following)) receiver.following = [];

                if (!receiver.friends.includes(senderId)) receiver.friends.push(senderId);
                // Bi-directional following on friend accept?
                // Typically friends follow each other.
                if (!receiver.followers.includes(senderId)) receiver.followers.push(senderId);
                if (!receiver.following.includes(senderId)) receiver.following.push(senderId);

                await receiver.save();
            }

            if (sender) {
                if (!Array.isArray(sender.friends)) sender.friends = [];
                if (!Array.isArray(sender.followers)) sender.followers = [];
                if (!Array.isArray(sender.following)) sender.following = [];

                if (!sender.friends.includes(receiverId)) sender.friends.push(receiverId);
                if (!sender.followers.includes(receiverId)) sender.followers.push(receiverId);
                if (!sender.following.includes(receiverId)) sender.following.push(receiverId);

                await sender.save();
            }

            return NextResponse.json({ message: 'Friend request accepted', status: 'accepted' });
        }

        if (action === 'reject') {
            request.status = 'rejected';
            await request.save();
            return NextResponse.json({ message: 'Friend request rejected', status: 'rejected' });
        }

    } catch (error) {
        console.error('Request action error:', error);
        return NextResponse.json({ message: 'Operation failed' }, { status: 500 });
    }
}
