import { Server, Socket } from 'socket.io';
import { MatchmakingService } from '../matchmaking/matchmaking.service';

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
    private activeMatches: Map<string, Set<string>> = new Map(); // Track active connections: userId -> Set<peerId>

    private initialize() {
        this.io.on('connection', (socket: Socket) => {
            console.log(`User connected: ${socket.id}`);

            // Initialize reputation if new
            if (!this.userReputations.has(socket.id)) {
                this.userReputations.set(socket.id, 100); // Start with 100 rep
            }

            // Broadcast user count
            this.io.emit('user-count', this.io.engine.clientsCount);

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

            // Handle Chat Messages
            socket.on('chat-message', (data) => {
                const { target, message } = data;
                socket.to(target).emit('chat-message', { sender: socket.id, message });
            });

            // Handle Media State Change
            socket.on('media-state-change', (data) => {
                const { target, isMuted, isVideoOff } = data;
                socket.to(target).emit('media-state-change', { sender: socket.id, isMuted, isVideoOff });
            });

            // Handle Skip Match
            socket.on('skip-match', (data) => {
                const { target } = data;
                this.handleDisconnection(socket.id, target);

                // Re-enter queue automatically
                this.matchmakingService.addToQueue(socket.id);
                // Trigger find match logic again... (simplified for now)
            });

            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.id}`);
                this.handleDisconnection(socket.id);
                this.updateReputation(socket.id); // Update rep on disconnect
                this.matchmakingService.removeFromQueue(socket.id);
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
