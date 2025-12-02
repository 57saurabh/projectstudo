import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { ConversationModel } from '@backend/src/models/Conversation';
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

        // Find conversations where unreadCount.userId > 0
        // Since it's a Map, we query by key
        const conversations = await ConversationModel.find({
            [`unreadCount.${userId}`]: { $gt: 0 }
        });

        let totalUnread = 0;
        conversations.forEach((conv: any) => {
            totalUnread += conv.unreadCount.get(userId) || 0;
        });

        return NextResponse.json({ count: totalUnread });

    } catch (error: any) {
        console.error('Error fetching unread count:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
