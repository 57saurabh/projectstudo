import { ConversationModel as Conversation } from '../models/Conversation';
import { UserModel } from '../models/User';
import { FriendRequestModel } from '../models/FriendRequest';

export class MessagesService {
    async getConversations(userId: string) {
        const conversations = await Conversation.find({
            "participants.userId": userId,
        }).sort({ updatedAt: -1 });

        const formattedConversations = await Promise.all(
            conversations.map(async (conv: any) => {
                const otherParticipant = conv.participants.find(
                    (p: any) => p.userId !== userId
                );

                if (!otherParticipant) return null;

                const otherUser = await UserModel.findById(otherParticipant.userId)
                    .select("displayName username avatarUrl");

                if (!otherUser) return null;

                return {
                    _id: otherUser._id,
                    conversationId: conv._id,
                    user: {
                        displayName: otherUser.displayName,
                        username: otherUser.username,
                        avatarUrl: otherUser.avatarUrl,
                    },
                    lastMessage: conv.lastMessage ? {
                        text: conv.lastMessage.text,
                        timestamp: conv.lastMessage.timestamp,
                        senderId: conv.lastMessage.senderId
                    } : null,
                    unreadCount: conv.unreadCount?.get(userId) || 0,
                    isFriend: false, // Populated later
                };
            })
        );

        const validConversations = formattedConversations.filter(Boolean);

        const currentUser = await UserModel.findById(userId).select("friends");
        const friendIds = currentUser?.friends.map((id: any) => id.toString()) || [];

        return validConversations.map((conv: any) => ({
            ...conv,
            isFriend: friendIds.includes(conv._id.toString()),
        }));
    }

    async getMessages(currentUserId: string, targetUserId: string) {
        const conversation = await Conversation.findOne({
            "participants.userId": { $all: [currentUserId, targetUserId] }
        }).sort({ 'messages.timestamp': 1 });

        let messages: any[] = [];
        if (conversation) {
            messages = conversation.messages.map((msg: any) => ({
                _id: msg._id,
                senderId: msg.senderId,
                receiverId: msg.receiverId,
                text: msg.text,
                timestamp: msg.timestamp,
                isRead: msg.isRead
            }));
        }

        // Check friend status
        const currentUser = await UserModel.findById(currentUserId);
        const canSend = currentUser?.friends.some((id: any) => id.toString() === targetUserId) || false;

        let requestStatus = 'none';
        let requestId = undefined;

        if (!canSend) {
            const pendingRequest = await FriendRequestModel.findOne({
                $or: [
                    { sender: currentUserId, receiver: targetUserId },
                    { sender: targetUserId, receiver: currentUserId }
                ],
                status: 'pending'
            });

            if (pendingRequest) {
                if (pendingRequest.sender.toString() === currentUserId) {
                    requestStatus = 'pending';
                } else {
                    requestStatus = 'received';
                    requestId = pendingRequest._id;
                }
            }
        }

        return {
            messages,
            canSend,
            requestStatus,
            requestId
        };
    }
}
