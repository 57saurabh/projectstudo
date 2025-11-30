import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import Message from '../chat/message.model';

export class SocketGateway {
    private io: Server;
    private matchmakingService: MatchmakingService;

    constructor(io: Server) {
        this.io = io;
        this.matchmakingService = new MatchmakingService();
        this.initialize();
    }

    private userStartTimes: Map<string, number> = new Map();
    private userReputations: Map<string, number> = new Map();
    private userNames: Map<string, string> = new Map(); // Track display names
    private activeMatches: Map<string, Set<string>> = new Map(); // Track active connections: userId -> Set<peerId>

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

            // Store display name
            const displayName = socket.handshake.query.displayName as string;
            this.userNames.set(socket.id, displayName || 'Stranger');

            // Initialize reputation if new
            if (!this.userReputations.has(socket.id)) {
                this.userReputations.set(socket.id, 100); // Start with 100 rep
            }

            // Broadcast user count
            this.io.emit('user-count', this.io.engine.clientsCount);

            // ... (get-online-users and find-match handlers remain same) ...

            // Handle Chat Messages
            socket.on('chat-message', async (data) => {
                const { target, message } = data;

                // 1. Relay to target (Real-time)
                const senderName = this.userNames.get(socket.id) || 'Stranger';
                socket.to(target).emit('chat-message', {
                    senderId: socket.id,
                    senderName: senderName,
                    text: message
                });

                // 2. Persist to DB (Encrypted)
                try {
                    const encryptedText = this.encryptMessage(message);
                    await Message.create({
                        senderId: socket.id,
                        receiverId: target,
                        text: encryptedText,
                        timestamp: new Date()
                    });
                    console.log('Message saved to DB (Encrypted)');
                } catch (err) {
                    console.error('Failed to save message:', err);
                }
            });

            // Handle Get Online Users
            socket.on('get-online-users', () => {
                const users = [];
                for (const [id, socket] of this.io.sockets.sockets) {
                    users.push({
                        id: id,
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
                    // Start call timer for both
                    const now = Date.now();
                    this.userStartTimes.set(socket.id, now);
                    this.userStartTimes.set(match, now);

                    // Track active match
                    if (!this.activeMatches.has(socket.id)) this.activeMatches.set(socket.id, new Set());
                    if (!this.activeMatches.has(match)) this.activeMatches.set(match, new Set());

                    this.activeMatches.get(socket.id)!.add(match);
                    this.activeMatches.get(match)!.add(socket.id);

                    // Notify both users with profile info
                    this.io.to(socket.id).emit('match-found', {
                        peerId: match,
                        initiator: true,
                        reputation: this.userReputations.get(match) || 100,
                        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${match}`
                    });
                    this.io.to(match).emit('match-found', {
                        peerId: socket.id,
                        initiator: false,
                        reputation: this.userReputations.get(socket.id) || 100,
                        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${socket.id}`
                    });
                }
            });

            // Handle WebRTC Signaling
            socket.on('offer', (data) => {
                const { target, sdp } = data;
                socket.to(target).emit('offer', { sender: socket.id, sdp });
            });

            socket.on('answer', (data) => {
                const { target, sdp } = data;
                socket.to(target).emit('answer', { sender: socket.id, sdp });
            });

            socket.on('ice-candidate', (data) => {
                const { target, candidate } = data;
                socket.to(target).emit('ice-candidate', { sender: socket.id, candidate });
            });

            // ... (inside initialize)

            // Handle Chat Messages
            socket.on('chat-message', async (data) => {
                const { target, message } = data;

                // 1. Relay to target (Real-time)
                socket.to(target).emit('chat-message', { sender: socket.id, message });

                // 2. Persist to DB (Encrypted)
                try {
                    const encryptedText = this.encryptMessage(message);
                    await Message.create({
                        senderId: socket.id,
                        receiverId: target,
                        text: encryptedText,
                        timestamp: new Date()
                    });
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
                    const now = Date.now();
                    this.userStartTimes.set(socket.id, now);
                    this.userStartTimes.set(match, now);

                    // Track active match
                    if (!this.activeMatches.has(socket.id)) this.activeMatches.set(socket.id, new Set());
                    if (!this.activeMatches.has(match)) this.activeMatches.set(match, new Set());

                    this.activeMatches.get(socket.id)!.add(match);
                    this.activeMatches.get(match)!.add(socket.id);

                    this.io.to(socket.id).emit('match-found', {
                        peerId: match,
                        initiator: true,
                        reputation: this.userReputations.get(match) || 100,
                        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${match}`
                    });
                    this.io.to(match).emit('match-found', {
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
                this.io.emit('user-count', this.io.engine.clientsCount);
            });
        });
    }

    private handleDisconnection(userId: string, specificTarget?: string) {
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
