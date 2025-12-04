import { UserModel } from '../models/User';
import { FriendRequestModel } from '../models/FriendRequest';
import { Server } from 'socket.io';

export class FriendService {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
    }

    async sendFriendRequest(senderId: string, receiverId: string) {
        // Check if already friends
        const sender = await UserModel.findById(senderId);
        if (sender?.friends.some((id: any) => id.toString() === receiverId)) {
            throw new Error('Already friends');
        }

        // Check if request already exists
        const existingRequest = await FriendRequestModel.findOne({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ],
            status: 'pending'
        });

        if (existingRequest) {
            throw new Error('Friend request already pending');
        }

        const request = await FriendRequestModel.create({
            sender: senderId,
            receiver: receiverId,
            status: 'pending'
        });

        // Emit event to receiver
        // We need to find the socket ID for the receiver. 
        // Since we don't have direct access to SocketGateway's map here easily without circular dependency,
        // we can emit to a room named after the userId (if we joined them).
        // In socket.gateway.ts we saw: socket.join(userId);
        this.io.to(receiverId).emit('friend_request', {
            requestId: request._id,
            sender: {
                _id: sender?._id,
                displayName: sender?.displayName,
                username: sender?.username,
                avatarUrl: sender?.avatarUrl
            }
        });

        return request;
    }

    async acceptFriendRequest(requestId: string, userId: string) {
        const request = await FriendRequestModel.findById(requestId);
        if (!request) throw new Error('Request not found');
        if (request.receiver.toString() !== userId) throw new Error('Unauthorized');
        if (request.status !== 'pending') throw new Error('Request not pending');

        request.status = 'accepted';
        await request.save();

        // Update Users
        await UserModel.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
        await UserModel.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

        // Emit events
        this.io.to(request.sender.toString()).emit('friendship_approved', { friendId: request.receiver });
        this.io.to(request.receiver.toString()).emit('friendship_approved', { friendId: request.sender });

        return request;
    }

    async rejectFriendRequest(requestId: string, userId: string) {
        const request = await FriendRequestModel.findById(requestId);
        if (!request) throw new Error('Request not found');
        if (request.receiver.toString() !== userId) throw new Error('Unauthorized');

        request.status = 'rejected';
        await request.save();

        return request;
    }

    async areFriends(userA: string, userB: string): Promise<boolean> {
        const user = await UserModel.findById(userA);
        return user?.friends.some((id: any) => id.toString() === userB) || false;
    }

    async getFriends(userId: string) {
        const user = await UserModel.findById(userId).populate('friends', 'displayName username avatarUrl status');
        if (!user) throw new Error('User not found');
        return user.friends;
    }

    async getPendingRequests(userId: string) {
        return await FriendRequestModel.find({
            receiver: userId,
            status: 'pending'
        }).populate('sender', 'displayName username avatarUrl');
    }
}
