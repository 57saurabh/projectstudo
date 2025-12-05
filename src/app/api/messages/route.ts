import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { ConversationModel } from '@backend/src/models/Conversation';
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

        const conversations = await ConversationModel.find({
            "participants.userId": userId
        }).sort({ updatedAt: -1 });

        // Enrich with user details
        const enrichedConversations = await Promise.all(conversations.map(async (conv: any) => {
            const otherParticipant = conv.participants.find((p: any) => p.userId !== userId);
            const otherUser = await UserModel.findById(otherParticipant.userId).select('displayName username avatarUrl');

            return {
                _id: otherParticipant.userId, // Use other user's ID as conversation ID for frontend convenience
                user: otherUser,
                lastMessage: conv.lastMessage,
                unreadCount: conv.unreadCount.get(userId) || 0,
                updatedAt: conv.updatedAt
            };
        }));

        return NextResponse.json(enrichedConversations);

    } catch (error: any) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
