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
                    // Create a proposal instead of active match
                    if (!this.matchProposals.has(socket.id)) this.matchProposals.set(socket.id, new Set());
                    if (!this.matchProposals.has(match)) this.matchProposals.set(match, new Set());

                    this.matchProposals.get(socket.id)!.add(match);
                    this.matchProposals.get(match)!.add(socket.id);

                    // Initialize pending acceptance set (using a unique key for this pair, e.g., sorted IDs)
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

            // Handle Chat Messages
            socket.on('chat-message', async (data) => {
                const { target, message } = data;

                // Guard: Only allow if active match (or maybe proposed? No, only active)
                if (!this.activeMatches.get(socket.id)?.has(target)) return;

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
                this.io.emit('user-count', this.io.engine.clientsCount);
            });
        });
    }

    private handleDisconnection(userId: string, specificTarget?: string) {
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
