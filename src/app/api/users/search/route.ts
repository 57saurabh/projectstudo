import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { UserModel as User } from '@/models/User';
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

// GET: Search users
export async function GET(req: Request) {
    try {
        await dbConnect();
        const userId = getUserId(req);
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query || query.length < 3) {
            return NextResponse.json([], { status: 200 });
        }

        // Find users matching query, exclude current user
        const users = await User.find({
            $and: [
                { _id: { $ne: userId } },
                {
                    $or: [
                        { username: { $regex: query, $options: 'i' } },
                        { displayName: { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        }).select('displayName username avatarUrl status').limit(10);

        return NextResponse.json(users, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
