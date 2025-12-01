import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import Message from '../chat/message.model';
import { UserModel } from '../models/User';
import { ModerationService } from '../microservices/moderation/moderationService';

export class SocketGateway {
    private io: Server;
    private matchmakingService: MatchmakingService;
    private moderationService: ModerationService;

    constructor(io: Server) {
        this.io = io;
        this.matchmakingService = new MatchmakingService();
        this.moderationService = new ModerationService();
        this.initialize();
    }

    private userStartTimes: Map<string, number> = new Map();
    private userReputations: Map<string, number> = new Map();
    private userNames: Map<string, string> = new Map();
    private socketToUserId: Map<string, string> = new Map();
    private userIdToSocket: Map<string, string> = new Map();
    private activeMatches: Map<string, Set<string>> = new Map();
    private pendingMatches: Map<string, Set<string>> = new Map();
    private matchProposals: Map<string, Set<string>> = new Map();

    private encryptMessage(text: string): string {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(process.env.JWT_SECRET || 'secret', 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    private initialize() {
        this.io.on('connection', (socket: Socket) => {
            console.log(`User connected: ${socket.id}`);

            const displayName = socket.handshake.query.displayName as string;
            const username = socket.handshake.query.username as string;
            const userId = socket.handshake.query.userId as string;

            this.userNames.set(socket.id, username || displayName || 'Stranger');

            if (userId) {
                this.socketToUserId.set(socket.id, userId);
                this.userIdToSocket.set(userId, socket.id);
                socket.join(userId);
            }

            if (!this.userReputations.has(socket.id)) {
                this.userReputations.set(socket.id, 100);
            }

            this.io.emit('user-count', this.io.engine.clientsCount);

            // ---------------- GET ONLINE USERS ----------------
            socket.on('get-online-users', () => {
                const users = [];
                for (const [id] of this.io.sockets.sockets) {
                    users.push({
                        id,
                        userId: this.socketToUserId.get(id),
                        displayName: `User ${id.slice(0, 4)}`,
                        reputation: this.userReputations.get(id) || 100
                    });
                }
                socket.emit('online-users-list', users);
            });

            // ---------------- FIND MATCH ----------------
            socket.on('find-match', async () => {
                await this.matchmakingService.addToQueue(socket.id);
                const match = await this.matchmakingService.findMatch(socket.id);

                if (match) {
                    if (!this.matchProposals.has(socket.id)) this.matchProposals.set(socket.id, new Set());
                    if (!this.matchProposals.has(match)) this.matchProposals.set(match, new Set());

                    this.matchProposals.get(socket.id)!.add(match);
                    this.matchProposals.get(match)!.add(socket.id);

                    const matchKey = [socket.id, match].sort().join(':');
                    this.pendingMatches.set(matchKey, new Set());

                    const currentUserId = this.socketToUserId.get(socket.id);
                    const matchUserId = this.socketToUserId.get(match);

                    let socketUser = null;
                    let matchUser = null;

                    if (currentUserId && matchUserId) {
                        try {
                            [socketUser, matchUser] = await Promise.all([
                                UserModel.findById(currentUserId).select('username bio country language'),
                                UserModel.findById(matchUserId).select('username bio country language')
                            ]);
                        } catch (err) {
                            console.error('Error fetching user details:', err);
                        }
                    }

                    this.io.to(socket.id).emit('match-proposed', {
                        peerId: match,
                        peerUserId: matchUserId,
                        initiator: true,
                        reputation: this.userReputations.get(match) || 100,
                        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${match}`,
                        username: matchUser?.username || 'Stranger',
                        bio: matchUser?.bio || '',
                        country: matchUser?.country || '',
                        language: matchUser?.language || ''
                    });

                    this.io.to(match).emit('match-proposed', {
                        peerId: socket.id,
                        peerUserId: currentUserId,
                        initiator: false,
                        reputation: this.userReputations.get(socket.id) || 100,
                        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${socket.id}`,
                        username: socketUser?.username || 'Stranger',
                        bio: socketUser?.bio || '',
                        country: socketUser?.country || '',
                        language: socketUser?.language || ''
                    });
                }
            });

            // ---------------- ACCEPT MATCH ----------------
            socket.on('accept-match', (data) => {
                const { target } = data;
                const matchKey = [socket.id, target].sort().join(':');

                if (!this.pendingMatches.has(matchKey)) return;

                this.pendingMatches.get(matchKey)!.add(socket.id);

                if (this.pendingMatches.get(matchKey)!.size === 2) {
                    this.pendingMatches.delete(matchKey);

                    if (!this.activeMatches.has(socket.id)) this.activeMatches.set(socket.id, new Set());
                    if (!this.activeMatches.has(target)) this.activeMatches.set(target, new Set());

                    this.activeMatches.get(socket.id)!.add(target);
                    this.activeMatches.get(target)!.add(socket.id);

                    const now = Date.now();
                    this.userStartTimes.set(socket.id, now);
                    this.userStartTimes.set(target, now);

                    const isInitiator = socket.id < target;

                    this.io.to(socket.id).emit('start-call', { peerId: target, shouldOffer: isInitiator });
                    this.io.to(target).emit('start-call', { peerId: socket.id, shouldOffer: !isInitiator });
                }
            });

            // ---------------- SIGNALING ----------------
            socket.on('offer', (data) => {
                const { target, sdp } = data;
                if (this.activeMatches.get(socket.id)?.has(target)) {
                    socket.to(target).emit('offer', { sender: socket.id, sdp });
                }
            });

            socket.on('answer', (data) => {
                const { target, sdp } = data;
                if (this.activeMatches.get(socket.id)?.has(target)) {
                    socket.to(target).emit('answer', { sender: socket.id, sdp });
                }
            });

            socket.on('ice-candidate', (data) => {
                const { target, candidate } = data;
                if (this.activeMatches.get(socket.id)?.has(target)) {
                    socket.to(target).emit('ice-candidate', { sender: socket.id, candidate });
                }
            });

            // ---------------- CHAT MESSAGE ----------------
            socket.on('chat-message', async (data) => {
                try {
                    const { target, message } = data;

                    const senderUserId = this.socketToUserId.get(socket.id);
                    if (!senderUserId) {
                        socket.emit('error', { message: 'User not authenticated' });
                        return;
                    }

                    const sender = await UserModel.findById(senderUserId);
                    if (!sender || !sender.friends.some((id: any) => id.toString() === target)) {
                        socket.emit('error', { code: 'NOT_FRIENDS', message: 'Messaging allowed only between friends.' });
                        return;
                    }

                    const filteredMessage = this.moderationService.filterContent(message);

                    const { ConversationModel } = await import('../models/Conversation');

                    let conversation = await ConversationModel.findOne({
                        "participants.userId": { $all: [senderUserId, target] }
                    });

                    const encryptedMessage = this.encryptMessage(filteredMessage);

                    const newMessage = {
                        senderId: senderUserId,
                        receiverId: target,
                        text: encryptedMessage,
                        timestamp: new Date(),
                        isRead: false
                    };

                    if (!conversation) {
                        conversation = await ConversationModel.create({
                            participants: [{ userId: senderUserId }, { userId: target }],
                            messages: [newMessage],
                            lastMessage: newMessage,
                            unreadCount: {
                                [senderUserId]: 0,
                                [target]: 1
                            }
                        });
                    } else {
                        conversation.messages.push(newMessage);
                        conversation.lastMessage = newMessage;

                        const currentUnread = conversation.unreadCount.get(target) || 0;
                        conversation.unreadCount.set(target, currentUnread + 1);
                        await conversation.save();
                    }

                    this.io.to(target).emit('chat-message', {
                        senderId: senderUserId,
                        text: encryptedMessage,
                        timestamp: newMessage.timestamp.toISOString(),
                        conversationId: conversation._id
                    });

                    socket.emit('message-sent', {
                        receiverId: target,
                        text: encryptedMessage,
                        timestamp: newMessage.timestamp.toISOString(),
                        conversationId: conversation._id
                    });

                } catch (err) {
                    console.error('Chat error:', err);
                    socket.emit('error', { message: 'Failed to send message' });
                }
            });

            // ---------------- MARK AS READ ----------------
            socket.on('mark-read', async (data: { senderId: string }) => {
                try {
                    const userId = this.socketToUserId.get(socket.id);
                    if (!userId) return;

                    const { ConversationModel } = await import('../models/Conversation');

                    const conversation = await ConversationModel.findOne({
                        "participants.userId": { $all: [userId, data.senderId] }
                    });

                    if (!conversation) return;

                    conversation.unreadCount.set(userId, 0);

                    conversation.messages.forEach((msg: any) => {
                        if (msg.receiverId === userId && !msg.isRead) {
                            msg.isRead = true;
                        }
                    });

                    await conversation.save();

                    const senderSocketId = this.userIdToSocket.get(data.senderId);
                    if (senderSocketId) {
                        this.io.to(senderSocketId).emit('messages-read', {
                            readerId: userId,
                            conversationId: conversation._id
                        });
                    }

                } catch (err) {
                    console.error('Failed to mark messages as read:', err);
                }
            });

            // ---------------- SKIP MATCH ----------------
            socket.on('skip-match', async ({ target }) => {
                this.handleDisconnection(socket.id, target);

                await this.matchmakingService.addToQueue(socket.id);
                const match = await this.matchmakingService.findMatch(socket.id);

                if (match) {
                    if (!this.matchProposals.has(socket.id)) this.matchProposals.set(socket.id, new Set());
                    if (!this.matchProposals.has(match)) this.matchProposals.set(match, new Set());

                    this.matchProposals.get(socket.id)!.add(match);
                    this.matchProposals.get(match)!.add(socket.id);

                    const matchKey = [socket.id, match].sort().join(':');
                    this.pendingMatches.set(matchKey, new Set());

                    this.io.to(socket.id).emit('match-proposed', {
                        peerId: match,
                        initiator: true,
                        reputation: this.userReputations.get(match) || 100,
                        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${match}`
                    });

                    this.io.to(match).emit('match-proposed', {
                        peerId: socket.id,
                        initiator: false,
                        reputation: this.userReputations.get(socket.id) || 100,
                        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${socket.id}`
                    });
                }
            });

            // ---------------- DISCONNECT ----------------
            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.id}`);
                this.handleDisconnection(socket.id);
                this.updateReputation(socket.id);
                this.matchmakingService.removeFromQueue(socket.id);
                this.userNames.delete(socket.id);

                const userId = this.socketToUserId.get(socket.id);
                if (userId) this.userIdToSocket.delete(userId);

                this.socketToUserId.delete(socket.id);

                this.io.emit('user-count', this.io.engine.clientsCount);
            });
        });
    }

    // ---------------- CLEANUP LOGIC ----------------
    private handleDisconnection(userId: string, specificTarget?: string) {
        // Cleanup pendingMatches
        for (const [key] of this.pendingMatches.entries()) {
            if (key.includes(userId)) {
                if (specificTarget && !key.includes(specificTarget)) continue;

                const [userA, userB] = key.split(':');
                const otherUser = userA === userId ? userB : userA;

                this.io.to(otherUser).emit('match-cancelled');
                this.pendingMatches.delete(key);
            }
        }

        // Cleanup proposals
        if (this.matchProposals.has(userId)) {
            const peers = this.matchProposals.get(userId)!;
            peers.forEach(peerId => {
                if (specificTarget && peerId !== specificTarget) return;
                if (this.matchProposals.has(peerId)) {
                    this.matchProposals.get(peerId)!.delete(userId);
                }
            });
            if (!specificTarget) this.matchProposals.delete(userId);
            else peers.delete(specificTarget);
        }

        const peers = this.activeMatches.get(userId);
        if (!peers) return;

        const targets = specificTarget ? [specificTarget] : Array.from(peers);

        targets.forEach(peerId => {
            if (!peers.has(peerId)) return;

            const peerPeers = this.activeMatches.get(peerId);

            if (peerPeers && peerPeers.size === 1 && peerPeers.has(userId)) {
                this.io.to(peerId).emit('force-disconnect');
                peerPeers.delete(userId);
                this.activeMatches.delete(peerId);
            } else {
                this.io.to(peerId).emit('peer-left', { peerId: userId });
                if (peerPeers) peerPeers.delete(userId);
            }

            peers.delete(peerId);
        });

        if (peers.size === 0) {
            this.activeMatches.delete(userId);
        }
    }

    // ---------------- REPUTATION LOGIC ----------------
    private updateReputation(userId: string) {
        const startTime = this.userStartTimes.get(userId);
        if (!startTime) return;

        const durationMinutes = (Date.now() - startTime) / 60000;

        if (durationMinutes > 0.5) {
            const currentRep = this.userReputations.get(userId) || 100;
            const points = Math.floor(durationMinutes * 10);
            this.userReputations.set(userId, currentRep + points);
        }

        this.userStartTimes.delete(userId);
    }
}
