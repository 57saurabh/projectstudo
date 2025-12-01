import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Message from '@backend/src/chat/message.model';
import { UserModel as User } from '@/models/User';
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

        // Aggregation to find unique conversations and get the last message
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [{ senderId: userId }, { receiverId: userId }]
                }
            },
            {
                $sort: { timestamp: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$senderId', userId] },
                            '$receiverId',
                            '$senderId'
                        ]
                    },
                    lastMessage: { $first: '$$ROOT' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    let: { userId: { $toObjectId: '$_id' } }, // Convert string _id to ObjectId for lookup
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$userId'] } } }
                    ],
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    _id: 1,
                    'user.displayName': 1,
                    'user.username': 1,
                    'user.avatarUrl': 1,
                    lastMessage: 1
                }
            },
            {
                $sort: { 'lastMessage.timestamp': -1 }
            }
        ]);

        return NextResponse.json(conversations);

    } catch (error) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
