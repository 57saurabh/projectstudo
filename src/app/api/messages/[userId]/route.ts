import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { MessageModel as Message } from '@/models/Message';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';



export async function GET(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const decoded: any = jwt.verify(token, JWT_SECRET);
        console.log('Decoded JWT:', decoded);
        const currentUserId = decoded.id;
        const targetUserId = params.userId;
        console.log('Fetching messages between:', currentUserId, 'and', targetUserId);
        const { ConversationModel } = await import('@/models/Conversation');

        const conversation = await ConversationModel.findOne({
            "participants.userId": { $all: [currentUserId, targetUserId] }
        }).sort({ 'messages.timestamp': 1 }); // Sort messages within the conversation
        console.log('Found conversation:', conversation);
        let decryptedMessages: any[] = [];
        let requestId = undefined; // Initialize requestId here

        if (conversation) {
            decryptedMessages = conversation.messages.map((msg: any) => {
                return {
                    _id: msg._id,
                    senderId: msg.senderId,
                    receiverId: msg.receiverId,
                    text: msg.text, // Return message text as is
                    timestamp: msg.timestamp,
                    isRead: msg.isRead
                };
            });
        }

        // Check if friends
        const { UserModel } = await import('@/models/User');
        const { FriendRequestModel } = await import('@/models/FriendRequest'); // Dynamic import to avoid circular deps if any

        const currentUser = await UserModel.findById(currentUserId);

        const canSend = currentUser?.friends.some((id: any) => id.toString() === targetUserId) || false;

        let requestStatus = 'none';
        // requestId is already initialized above

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
            messages: decryptedMessages,
            canSend,
            requestStatus,
            requestId
        });

    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
