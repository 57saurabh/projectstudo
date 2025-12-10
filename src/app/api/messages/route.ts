import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { ChatModel } from '@backend/src/models/Chat';
import { MessageModel } from '@backend/src/models/Message';
import { UserModel } from '@/models/User.schema';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        let userId: string;
        try {
            const decoded: any = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        } catch (err) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }

        // 1. Find all chats where user is a participant
        const chats = await ChatModel.find({
            participants: userId
        }).sort({ updatedAt: -1 });

        // 2. Enrich with User Info & Last Message
        const enrichedConversations = await Promise.all(chats.map(async (chat: any) => {
            // Find the *other* participant
            // Assuming 1v1 for now based on current logic, but scalable
            const otherParticipantId = chat.participants.find((p: string) => p !== userId);

            if (!otherParticipantId) return null; // Should not happen in valid 1v1

            const otherUser = await UserModel.findById(otherParticipantId).select('displayName username avatarUrl');

            // Get Last Message
            const lastMessage = await MessageModel.findOne({ chatId: chat._id })
                .sort({ timestamp: -1 });

            // Count Unread
            const unreadCount = await MessageModel.countDocuments({
                chatId: chat._id,
                receiverId: userId,
                status: { $ne: 'seen' }
            });

            return {
                _id: otherParticipantId, // Frontend expects 'otherUserId' as ID for linking
                chatId: chat._id, // Add real chatId for reference
                user: otherUser || { displayName: 'Unknown User', username: 'unknown', avatarUrl: '' },
                lastMessage: lastMessage ? {
                    text: lastMessage.text,
                    timestamp: lastMessage.timestamp,
                    senderId: lastMessage.senderId
                } : null,
                unreadCount: unreadCount,
                updatedAt: chat.updatedAt
            };
        }));

        // Filter out nulls (failed lookups)
        const validConversations = enrichedConversations.filter(c => c !== null);

        // Sort by last message timestamp (or updated at) just to be safe
        validConversations.sort((a, b) => {
            const timeA = new Date(a!.lastMessage?.timestamp || a!.updatedAt).getTime();
            const timeB = new Date(b!.lastMessage?.timestamp || b!.updatedAt).getTime();
            return timeB - timeA;
        });

        return NextResponse.json(validConversations);

    } catch (error: any) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
