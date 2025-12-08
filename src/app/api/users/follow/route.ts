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

export async function POST(req: Request) {
    await connectDB();
    try {
        const currentUserId = getUserId(req);
        if (!currentUserId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { targetUserId, action } = await req.json();

        if (!targetUserId) {
            return NextResponse.json({ message: 'Target user ID required' }, { status: 400 });
        }

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        if (action === 'follow') {
            if (!Array.isArray(currentUser.following)) currentUser.following = [];
            if (!Array.isArray(targetUser.followers)) targetUser.followers = [];

            if (!currentUser.following.includes(targetUserId)) {
                currentUser.following.push(targetUserId);
                await currentUser.save();
            }
            if (!targetUser.followers.includes(currentUserId)) {
                targetUser.followers.push(currentUserId);
                await targetUser.save();
            }
            return NextResponse.json({ message: 'Followed successfully', isFollowing: true });
        } else if (action === 'unfollow') {
            if (!Array.isArray(currentUser.following)) currentUser.following = [];
            if (!Array.isArray(targetUser.followers)) targetUser.followers = [];

            currentUser.following = currentUser.following.filter((id: any) => id.toString() !== targetUserId);
            await currentUser.save();

            targetUser.followers = targetUser.followers.filter((id: any) => id.toString() !== currentUserId);
            await targetUser.save();

            return NextResponse.json({ message: 'Unfollowed successfully', isFollowing: false });
        }

        return NextResponse.json({ message: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Follow error:', error);
        return NextResponse.json({ message: 'Operation failed' }, { status: 500 });
    }
}
