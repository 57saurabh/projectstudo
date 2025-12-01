import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { MessageModel as Message } from '@/models/Message';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const decoded: any = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const count = await Message.countDocuments({
            receiverId: userId,
            isRead: false
        });

        return NextResponse.json({ count });

    } catch (error) {
        console.error('Error fetching unread count:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
