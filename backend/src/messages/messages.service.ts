import { MessageModel } from '../models/Message';
import { UserModel } from '../models/User';
import { FriendshipModel } from '../models/Friendship';
import { FriendRequestModel } from '../models/FriendRequest';

export class MessagesService {
    async getConversations(userId: string) {
        // Aggregate messages to find unique conversations (Users)
        const conversations = await MessageModel.aggregate([
            { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: { $cond: [{ $eq: ["$senderId", userId] }, "$receiverId", "$senderId"] },
                    lastMessage: { $first: "$$ROOT" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$receiverId", userId] }, { $eq: ["$isRead", false] }] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { "lastMessage.timestamp": -1 } }
        ]);
        console.log('[MessagesService] getConversations raw aggregation:', conversations.length > 0 ? conversations[0] : 'Empty', `Count: ${conversations.length}`);

        const formatted = await Promise.all(conversations.map(async (conv) => {
            const partnerId = conv._id;
            const user = await UserModel.findById(partnerId).select("displayName username avatarUrl");
            if (!user) return null;

            const isFriend = await FriendshipModel.exists({
                $or: [
                    { userId: userId, friendId: partnerId },
                    { userId: partnerId, friendId: userId }
                ]
            });

            return {
                _id: partnerId,
                conversationId: partnerId,
                user: {
                    displayName: user.displayName,
                    username: user.username,
                    avatarUrl: user.avatarUrl
                },
                lastMessage: {
                    text: conv.lastMessage.text,
                    timestamp: conv.lastMessage.timestamp,
                    senderId: conv.lastMessage.senderId
                },
                unreadCount: conv.unreadCount,
                isFriend: !!isFriend
            };
        }));

        return formatted.filter(Boolean);
    }

    async getMessages(currentUserId: string, targetUserId: string) {
        const messages = await MessageModel.find({
            $or: [
                { senderId: currentUserId, receiverId: targetUserId },
                { senderId: targetUserId, receiverId: currentUserId }
            ]
        }).sort({ timestamp: 1 });

        const isFriend = await FriendshipModel.exists({
            $or: [
                { userId: currentUserId, friendId: targetUserId },
                { userId: targetUserId, friendId: currentUserId }
            ]
        });

        const canSend = !!isFriend;

        let requestStatus = 'none';
        let requestId = undefined;

        if (!canSend) {
            const pending = await FriendRequestModel.findOne({
                $or: [
                    { sender: currentUserId, receiver: targetUserId },
                    { sender: targetUserId, receiver: currentUserId }
                ],
                status: 'pending'
            });
            if (pending) {
                requestStatus = pending.sender.toString() === currentUserId ? 'pending' : 'received';
                requestId = pending._id;
            }
        }

        return {
            messages,
            canSend,
            requestStatus,
            requestId
        };
    }

    async getUnreadCount(userId: string) {
        const count = await MessageModel.countDocuments({
            receiverId: userId,
            isRead: false
        });
        return { count };
    }
}
