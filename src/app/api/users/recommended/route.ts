import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { UserModel as User } from '@/models/User.schema';
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

export async function GET(req: Request) {
    await connectDB();
    try {
        const currentUserId = getUserId(req);

        // Find users excluding the current user
        // In a real app, this would be smarter (e.g., based on interests, location)
        // For now, just random users
        let query: any = {};

        if (currentUserId) {
            const currentUser = await User.findById(currentUserId).select('friends');
            const friendIds = currentUser?.friends || [];

            // Ensure friendIds is an array (safety check)
            const excludeIds = Array.isArray(friendIds) ? [...friendIds, currentUserId] : [currentUserId];

            query = { _id: { $nin: excludeIds } };
        }

        const users = await User.find(query)
            .select('displayName username avatarUrl')
            .limit(20);

        // Shuffle array to make it look "random"
        const shuffled = users.sort(() => 0.5 - Math.random()).slice(0, 5);

        return NextResponse.json(shuffled);
    } catch (error) {
        return NextResponse.json({ message: 'Failed to fetch recommendations' }, { status: 500 });
    }
}
