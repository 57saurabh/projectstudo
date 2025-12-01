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
    private userNames: Map<string, string> = new Map(); // Track display names
    private socketToUserId: Map<string, string> = new Map(); // Map socketId -> userId (DB _id)
    private userIdToSocket: Map<string, string> = new Map(); // Map userId -> socketId
    private activeMatches: Map<string, Set<string>> = new Map(); // Track active connections: userId -> Set<peerId>
    private pendingMatches: Map<string, Set<string>> = new Map(); // Track pending proposals: matchId (initiatorId) -> Set<userId> (accepted)
    private matchProposals: Map<string, Set<string>> = new Map(); // Track who is proposed to whom: userId -> Set<peerId>

    // Encryption Utilities
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

            // Store display name (prioritize username)
            // Store display name (prioritize username)
            const displayName = socket.handshake.query.displayName as string;
            const username = socket.handshake.query.username as string;
            const userId = socket.handshake.query.userId as string;

            // Use username if available, otherwise fallback to displayName or 'Stranger'
            this.userNames.set(socket.id, username || displayName || 'Stranger');

            if (userId) {
                this.socketToUserId.set(socket.id, userId);
                this.userIdToSocket.set(userId, socket.id);
                socket.join(userId); // Join room named after userId for direct messaging
            }

            // Initialize reputation if new
            if (!this.userReputations.has(socket.id)) {
                this.userReputations.set(socket.id, 100); // Start with 100 rep
            }

            // Broadcast user count
            this.io.emit('user-count', this.io.engine.clientsCount);

            // ... (get-online-users and find-match handlers remain same) ...



            // Handle Get Online Users
            socket.on('get-online-users', () => {
                const users = [];
                for (const [id, socket] of this.io.sockets.sockets) {
                    users.push({
                        id: id,
                        userId: this.socketToUserId.get(id), // Include real User ID
                        displayName: `User ${id.slice(0, 4)}`, // Mock name
                        reputation: this.userReputations.get(id) || 100
                    });
                }
                socket.emit('online-users-list', users);
            });

            // Handle Random Matchmaking
            socket.on('find-match', async (data) => {
                await this.matchmakingService.addToQueue(socket.id);
                const match = await this.matchmakingService.findMatch(socket.id);

                if (match) {
                    // Create a proposal instead of active match
                    if (!this.matchProposals.has(socket.id)) this.matchProposals.set(socket.id, new Set());
                    if (!this.matchProposals.has(match)) this.matchProposals.set(match, new Set());

                    this.matchProposals.get(socket.id)!.add(match);
                    this.matchProposals.get(match)!.add(socket.id);

                    // Initialize pending acceptance set (using a unique key for this pair, e.g., sorted IDs)
                    const matchKey = [socket.id, match].sort().join(':');
                    this.pendingMatches.set(matchKey, new Set());

                    // Fetch full user details for profile display
                    // Fetch full user details for profile display
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

                    // Notify both users with profile info (PROPOSED)
                    this.io.to(socket.id).emit('match-proposed', {
                        peerId: match,
                        peerUserId: matchUserId, // Send real User ID
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
                        peerUserId: currentUserId, // Send real User ID
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

            // Handle Match Acceptance
            socket.on('accept-match', (data) => {
                const { target } = data;
                const matchKey = [socket.id, target].sort().join(':');

                if (this.pendingMatches.has(matchKey)) {
                    this.pendingMatches.get(matchKey)!.add(socket.id);

                    // Check if both accepted
                    if (this.pendingMatches.get(matchKey)!.size === 2) {
                        // Both accepted! Start the call.
                        this.pendingMatches.delete(matchKey);

                        // Move to active matches
                        if (!this.activeMatches.has(socket.id)) this.activeMatches.set(socket.id, new Set());
                        if (!this.activeMatches.has(target)) this.activeMatches.set(target, new Set());

                        this.activeMatches.get(socket.id)!.add(target);
                        this.activeMatches.get(target)!.add(socket.id);

                        // Start timer
                        const now = Date.now();
                        this.userStartTimes.set(socket.id, now);
                        this.userStartTimes.set(target, now);

                        // Emit start-call
                        // We need to tell one to be the initiator (offerer). 
                        // We can stick to the original initiator logic or just pick one (e.g., lexicographically first).
                        // Let's rely on the original 'initiator' flag sent in 'match-proposed'.
                        // Ideally, we re-confirm who is initiator.
                        const isInitiator = socket.id < target; // Simple deterministic rule

                        this.io.to(socket.id).emit('start-call', { peerId: target, shouldOffer: isInitiator });
                        this.io.to(target).emit('start-call', { peerId: socket.id, shouldOffer: !isInitiator });
                    } else {
                        // Waiting for other
                        // socket.emit('waiting-for-peer'); // Optional feedback
                    }
                }
            });

            // Handle WebRTC Signaling (Guarded)
            socket.on('offer', (data) => {
                const { target, sdp } = data;
                // Guard: Only allow if active match
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

            // ... (inside initialize)

            // Handle Invite User
            socket.on('invite-user', (data) => {
                const { target } = data;

                // Guard: Can only invite if in an active match
                if (!this.activeMatches.has(socket.id)) {
                    socket.emit('error', { message: 'You must be in a call to invite others.' });
                    return;
                }

                // Guard: Check if target exists and is online
                if (!this.io.sockets.sockets.has(target)) {
                    socket.emit('error', { message: 'User is not online.' });
                    return;
                }

                // Guard: Check if target is already in a call
                if (this.activeMatches.has(target)) {
                    socket.emit('error', { message: 'User is already in another call.' });
                    return;
                }

                const senderName = this.userNames.get(socket.id) || 'Stranger';

                // Notify target of invite
                this.io.to(target).emit('invite-received', {
                    senderId: socket.id,
                    senderName: senderName,
                    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${socket.id}`
                });
            });

            // Handle Accept Invite
            socket.on('accept-invite', (data) => {
                const { senderId } = data;

                // Verify sender is still in a call
                if (!this.activeMatches.has(senderId)) {
                    socket.emit('error', { message: 'The call is no longer active.' });
                    return;
                }

                // Get all current participants in the sender's call
                const participants = this.activeMatches.get(senderId)!;

                // Add new user to everyone's active match list
                participants.forEach(participantId => {
                    this.activeMatches.get(participantId)!.add(socket.id);
                    // Notify existing participants
                    this.io.to(participantId).emit('user-joined', {
                        peerId: socket.id,
                        reputation: this.userReputations.get(socket.id) || 100,
                        displayName: this.userNames.get(socket.id) || 'Stranger'
                    });
                });

                // Add sender to new user's list (and others)
                this.activeMatches.set(socket.id, new Set(participants));
                this.activeMatches.get(socket.id)!.add(senderId); // Ensure sender is included

                // Add new user to sender's list
                this.activeMatches.get(senderId)!.add(socket.id);

                // Notify new user of success and send list of existing peers
                const existingPeers = Array.from(participants).map(pId => ({
                    id: pId,
                    displayName: this.userNames.get(pId) || 'Stranger',
                    reputation: this.userReputations.get(pId) || 100
                }));

                // Add sender to the list if not already there (it should be in participants set if logic is correct, but let's be safe)
                if (!participants.has(senderId)) {
                    existingPeers.push({
                        id: senderId,
                        displayName: this.userNames.get(senderId) || 'Stranger',
                        reputation: this.userReputations.get(senderId) || 100
                    });
                    // Also update state
                    this.activeMatches.get(socket.id)!.add(senderId);
                    this.activeMatches.get(senderId)!.add(socket.id);
                }

                socket.emit('join-success', { peers: existingPeers });
            });

            // ... (inside initialize)

            // Handle Chat Messages
            socket.on('chat-message', async (data) => {
                const { target, message } = data;

                // Guard: Check if target room exists (user is online)
                // Note: socket.to(userId) works even if user is offline (it just goes nowhere), 
                // but we might want to know if they are online to handle "sent" vs "delivered" status.
                // For now, we just emit. The client handles "delivered" via ack if we implemented it, 
                // but for this MVP, we just send.

                // We can check if the room has members if we really want to know:
                // const isOnline = this.io.sockets.adapter.rooms.get(target)?.size > 0;

                // Check if friends
                const senderUser = await UserModel.findById(socket.id); // Wait, socket.id is NOT userId. We need mapped userId.
                const senderUserId = this.socketToUserId.get(socket.id);

                if (!senderUserId) {
                    socket.emit('error', { message: 'User not authenticated' });
                    return;
                }

                const sender = await UserModel.findById(senderUserId);
                if (!sender || !sender.friends.some((id: any) => id.toString() === target)) {
                    // Not friends!
                    socket.emit('error', { code: 'NOT_FRIENDS', message: 'Messaging allowed only between friends.' });
                    return;
                }

                // Moderate Message
                const filteredMessage = this.moderationService.filterContent(message);

                try {
                    // 4. Save to DB (Conversation Model)
                    const { ConversationModel } = await import('../models/Conversation');

                    // Find conversation with both participants
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

                        // Increment unread count for receiver
                        const currentUnread = conversation.unreadCount.get(target) || 0;
                        conversation.unreadCount.set(target, currentUnread + 1);

                        await conversation.save();
                    }

                    // 5. Emit to receiver
                    this.io.to(target).emit('chat-message', {
                        senderId: senderUserId,
                        text: encryptedMessage,
                        timestamp: newMessage.timestamp.toISOString(),
                        conversationId: conversation._id
                    });

                    // 6. Emit to sender (ack)
                    socket.emit('message-sent', {
                        receiverId: target,
                        text: encryptedMessage,
                        timestamp: newMessage.timestamp.toISOString(),
                        conversationId: conversation._id
                    });

                } catch (error) {
                    console.error('Chat error:', error);
                    socket.emit('error', { message: 'Failed to send message' });
                }
            });

            // Handle Mark as Read
            socket.on('mark-read', async (data: { senderId: string }) => {
                const userId = this.socketToUserId.get(socket.id);
                if (!userId) return;

                try {
                    const { ConversationModel } = await import('../models/Conversation');

                    const conversation = await ConversationModel.findOne({
                        "participants.userId": { $all: [userId, data.senderId] }
                    });

                    if (conversation) {
                        // Reset unread count for current user
                        conversation.unreadCount.set(userId, 0);

                        // Mark specific messages as read (optional, but good for history)
                        conversation.messages.forEach((msg: any) => {
                            if (msg.receiverId === userId && !msg.isRead) {
                                msg.isRead = true;
                            }
                        });

                        await conversation.save();

                        // Notify sender that messages were read
                        const senderSocketId = this.userIdToSocket.get(data.senderId);
                        if (senderSocketId) {
                            this.io.to(senderSocketId).emit('messages-read', {
                                readerId: userId,
                                conversationId: conversation._id
                            });
                        }
                    }
                }
                    console.log('Message saved to DB (Encrypted)');
            } catch (err) {
                console.error('Failed to save message:', err);
            }
        });

        // ...

        // Handle Skip Match
        socket.on('skip-match', async (data) => {
            const { target } = data;
            this.handleDisconnection(socket.id, target);

            // Re-enter queue automatically
            await this.matchmakingService.addToQueue(socket.id);

            // Trigger find match logic again
            const match = await this.matchmakingService.findMatch(socket.id);
            if (match) {
                // Create a proposal instead of active match
                if (!this.matchProposals.has(socket.id)) this.matchProposals.set(socket.id, new Set());
                if (!this.matchProposals.has(match)) this.matchProposals.set(match, new Set());

                this.matchProposals.get(socket.id)!.add(match);
                this.matchProposals.get(match)!.add(socket.id);

                // Initialize pending acceptance set
                const matchKey = [socket.id, match].sort().join(':');
                this.pendingMatches.set(matchKey, new Set());

                // Notify both users with profile info (PROPOSED)
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

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            this.handleDisconnection(socket.id);
            this.updateReputation(socket.id); // Update rep on disconnect
            this.matchmakingService.removeFromQueue(socket.id);
            this.userNames.delete(socket.id); // Cleanup name
            const userId = this.socketToUserId.get(socket.id);
            if (userId) this.userIdToSocket.delete(userId);
            this.socketToUserId.delete(socket.id); // Cleanup userId mapping
            this.io.emit('user-count', this.io.engine.clientsCount);
        });
    });
}

    private handleDisconnection(userId: string, specificTarget ?: string) {
    // Cleanup Pending Matches
    for (const [key, pendingSet] of this.pendingMatches.entries()) {
        if (key.includes(userId)) {
            // If specific target, only remove if key involves target
            if (specificTarget && !key.includes(specificTarget)) continue;

            const [userA, userB] = key.split(':');
            const otherUser = userA === userId ? userB : userA;

            // Notify other user that proposal is cancelled
            this.io.to(otherUser).emit('match-cancelled');

            this.pendingMatches.delete(key);
        }
    }

    // Cleanup Proposals
    if (this.matchProposals.has(userId)) {
        const proposedPeers = this.matchProposals.get(userId)!;
        proposedPeers.forEach(peerId => {
            if (specificTarget && peerId !== specificTarget) return;

            if (this.matchProposals.has(peerId)) {
                this.matchProposals.get(peerId)!.delete(userId);
            }
        });
        if (!specificTarget) this.matchProposals.delete(userId);
        else proposedPeers.delete(specificTarget);
    }

    const peers = this.activeMatches.get(userId);
    if (!peers) return;

    // If specific target (skip match), only handle that one
    const targets = specificTarget ? [specificTarget] : Array.from(peers);

    targets.forEach(peerId => {
        if (peers.has(peerId)) {
            const peerPeers = this.activeMatches.get(peerId);

            // P2P Logic: If peer has only 1 connection (us), it's a 1-on-1 call
            if (peerPeers && peerPeers.size === 1 && peerPeers.has(userId)) {
                // Force disconnect the peer (send them back to searching)
                this.io.to(peerId).emit('force-disconnect');

                // Cleanup
                peerPeers.delete(userId);
                this.activeMatches.delete(peerId);
            } else {
                // Group Logic: Just notify peer we left
                this.io.to(peerId).emit('peer-left', { peerId: userId });
                if (peerPeers) peerPeers.delete(userId);
            }

            peers.delete(peerId);
        }
    });

    if (peers.size === 0) {
        this.activeMatches.delete(userId);
    }
}

    private updateReputation(userId: string) {
    const startTime = this.userStartTimes.get(userId);
    if (startTime) {
        const durationMinutes = (Date.now() - startTime) / 60000;
        if (durationMinutes > 0.5) { // Only count if > 30 seconds
            const currentRep = this.userReputations.get(userId) || 100;
            // +10 points per minute
            const points = Math.floor(durationMinutes * 10);
            this.userReputations.set(userId, currentRep + points);
        }
        this.userStartTimes.delete(userId);
    }
}
}
