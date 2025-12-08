import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { UserModel as User } from '@/models/User.schema';
import jwt from 'jsonwebtoken';
import { FriendRequestModel } from '@/models/FriendRequest';

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
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        const currentUserId = getUserId(req);

        if (!query) {
            return NextResponse.json([]);
        }

        if (!currentUserId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Search by username, displayName, or email
        // Case insensitive search using regex
        const searchRegex = new RegExp(query, 'i');

        const users = await User.find({
            $and: [
                { _id: { $ne: currentUserId } },
                {
                    $or: [
                        { username: searchRegex },
                        { displayName: searchRegex },
                        { email: searchRegex }
                    ]
                }
            ]
        }).select('displayName username avatarUrl followers following friends profession bio').limit(20);

        // Fetch additional context for each user (friend status, follow status, request status)
        const usersWithStatus = await Promise.all(users.map(async (user: any) => {
            const isFriend = Array.isArray(user.friends) && user.friends.includes(currentUserId);
            const isFollowing = Array.isArray(user.followers) && user.followers.includes(currentUserId);
            // Check for pending friend request
            const pendingRequest = await FriendRequestModel.findOne({
                $or: [
                    { sender: currentUserId, receiver: user._id, status: 'pending' },
                    { sender: user._id, receiver: currentUserId, status: 'pending' }
                ]
            });

            let friendStatus = 'none';
            if (isFriend) {
                friendStatus = 'friend';
            } else if (pendingRequest) {
                if (pendingRequest.sender.toString() === currentUserId) {
                    friendStatus = 'requested';
                } else {
                    friendStatus = 'pending_approval';
                }
            }

            return {
                ...user.toObject(),
                isFollowing,
                friendStatus
            };
        }));

        return NextResponse.json(usersWithStatus);
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ message: 'Search failed' }, { status: 500 });
    }
}
