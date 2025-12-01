import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { UserModel as User } from '@/models/User';
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

// PUT: Accept or Reject request
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        await dbConnect();
        const userId = getUserId(req);
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { action } = await req.json(); // 'accept' or 'reject'
        const requestId = params.id;

        const request = await FriendRequest.findById(requestId);
        if (!request) return NextResponse.json({ message: 'Request not found' }, { status: 404 });

        if (request.receiver.toString() !== userId) {
            return NextResponse.json({ message: 'Not authorized' }, { status: 403 });
        }

        if (action === 'accept') {
            request.status = 'accepted';
            await request.save();

            // Add to friends lists
            await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
            await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

            return NextResponse.json({ message: 'Friend request accepted' }, { status: 200 });
        } else if (action === 'reject') {
            request.status = 'rejected';
            await request.save();
            return NextResponse.json({ message: 'Friend request rejected' }, { status: 200 });
        } else {
            return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
        }

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
