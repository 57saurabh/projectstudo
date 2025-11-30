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

            // Handle Skip Match
            socket.on('skip-match', (data) => {
                const { target } = data;

                // Calculate reputation update
                this.updateReputation(socket.id);
                if (target) {
                    this.updateReputation(target);
                    socket.to(target).emit('peer-skipped', { sender: socket.id });
                }

                // Re-enter queue automatically
                this.matchmakingService.addToQueue(socket.id);
                this.matchmakingService.findMatch(socket.id).then((match) => {
                    if (match) {
                        const now = Date.now();
                        this.userStartTimes.set(socket.id, now);
                        this.userStartTimes.set(match, now);

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
            });

            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.id}`);
                this.updateReputation(socket.id); // Update rep on disconnect
                this.matchmakingService.removeFromQueue(socket.id);
                this.io.emit('user-count', this.io.engine.clientsCount);
            });
        });
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
