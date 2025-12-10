import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { ChatModel } from '@backend/src/models/Chat';
import { MessageModel } from '@backend/src/models/Message';
import { UserModel } from '@/models/User.schema';
import { FriendRequestModel } from '@backend/src/models/FriendRequest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export async function GET(req: Request, props: { params: Promise<{ userId: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        let currentUserId: string;
        try {
            const decoded: any = jwt.verify(token, JWT_SECRET);
            currentUserId = decoded.id;
        } catch (err) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }

        const targetUserId = params.userId;

        // 1. Find Chat
        const chat = await ChatModel.findOne({
            participants: { $all: [currentUserId, targetUserId], $size: 2 }
        });

        let messages: any[] = [];
        if (chat) {
            // 2. Fetch Messages for this Chat
            messages = await MessageModel.find({ chatId: chat._id.toString() })
                .sort({ timestamp: 1 });
        }

        // Check friendship status
        const currentUser = await UserModel.findById(currentUserId);
        const canSend = currentUser?.friends.includes(targetUserId) || false;

        let requestStatus = 'none';
        let requestId = undefined;

        if (!canSend) {
            const pendingRequest = await FriendRequestModel.findOne({
                $or: [
                    { sender: currentUserId, receiver: targetUserId },
                    { sender: targetUserId, receiver: currentUserId }
                ],
                status: 'pending'
            });

            if (pendingRequest) {
                if (pendingRequest.sender.toString() === currentUserId) {
                    requestStatus = 'pending';
                } else {
                    requestStatus = 'received';
                    requestId = pendingRequest._id;
                }
            }
        }

        return NextResponse.json({
            messages,
            canSend,
            requestStatus,
            requestId
        });

    } catch (error: any) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
