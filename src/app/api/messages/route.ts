import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { MessageModel as Message } from '@/models/Message';
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
                // Fetch conversations from ConversationModel
                // The following comments are from the user's instruction and indicate a thought process
                // regarding model location and import strategy.
                // Note: Frontend might not have direct access to backend models if they are in 'backend/src'.
                // But previously we were importing from '@/models/User'. Let's assume we need to copy the model or use a shared path.
                // Wait, the previous code imported from '@/models/User'.
                // I created Conversation.ts in 'backend/src/models'.
                // I should probably create it in 'src/models' as well for the Next.js API routes to access it,
                // OR fix the import path if there's a shared alias.
                // Given the previous pattern, I'll assume I need to create it in 'src/models' too or just use the one I created if I can import it.
                // Let's create 'src/models/Conversation.ts' to be safe and consistent with 'src/models/User.ts'.

                // ACTUALLY, I should have created the model in 'src/models' or 'backend/src/models' depending on where it's used.
                // The user has a monorepo-like structure?
                // 'backend/src/models' is for the custom server. 'src/models' is for Next.js.
                // I need to create 'src/models/Conversation.ts' as well.

                // Let's pause this tool call and create the file first.
                // The original aggregation logic is commented out or replaced based on the instruction.
                // For now, returning an empty array as a placeholder as per the instruction's provided code snippet.
                // Fetch conversations from ConversationModel
                // The following comments are from the user's instruction and indicate a thought process
                // Find conversations where current user is a participant
                const conversations = await ConversationModel.find({
                    "participants.userId": userId
                }).sort({ updatedAt: -1 });

                // Populate other participant details and format
                const formattedConversations = await Promise.all(conversations.map(async (conv: any) => {
                    const otherParticipantId = conv.participants.find((p: any) => p.userId !== userId)?.userId;
                    const otherUser = await User.findById(otherParticipantId).select('displayName username avatarUrl');

                    if (!otherUser) return null;

                    return {
                        _id: otherUser._id, // Keep the ID as the other user's ID for frontend compatibility
                        conversationId: conv._id, // Add actual conversation ID
                        displayName: otherUser.displayName,
                        username: otherUser.username,
                        avatarUrl: otherUser.avatarUrl,
                        lastMessage: conv.lastMessage?.text,
                        lastMessageTimestamp: conv.lastMessage?.timestamp,
                        unreadCount: conv.unreadCount?.get(userId) || 0,
                        isFriend: false // Will be updated below
                    };
                }));

                const validConversations = formattedConversations.filter(Boolean);

                // Check friend status
                const currentUser = await User.findById(userId).select('friends');
                const friendIds = currentUser?.friends.map((id: any) => id.toString()) || [];

                const finalConversations = validConversations.map((conv: any) => ({
                    ...conv,
                    isFriend: friendIds.includes(conv._id.toString())
                }));

                return NextResponse.json(finalConversations);

            } catch (error) {
                console.error('Error fetching conversations:', error);
                return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
            }
    }
```
