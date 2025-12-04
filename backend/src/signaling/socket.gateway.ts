import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { RoomService } from '../services/room.service';
import Message from '../chat/message.model';
import { UserModel } from '../models/User';
import { ModerationService } from '../microservices/moderation/moderationService';

export class SocketGateway {
    private io: Server;
    private matchmakingService: MatchmakingService;
    private roomService: RoomService;
    private moderationService: ModerationService;

    constructor(io: Server) {
        this.io = io;
        this.matchmakingService = new MatchmakingService();
        this.roomService = new RoomService();
        this.moderationService = new ModerationService();
        this.initialize();
    }

    private userStartTimes: Map<string, number> = new Map();
    private userReputations: Map<string, number> = new Map();
    private userNames: Map<string, string> = new Map();
    private socketToUserId: Map<string, string> = new Map();
    private userIdToSocket: Map<string, string> = new Map();

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
                // socket.join(userId); // We use room IDs now, but keeping user room for direct msgs is fine
                console.log(`User ${userId} joined room ${userId}`);
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

            // ---------------- JOIN QUEUE / FIND MATCH ----------------
            socket.on('find-match', async () => {
                console.log(`[Gateway] User ${socket.id} requested match.`);

                // If already in a room, leave it first? Or just ignore?
                // For now, assume they want to start fresh.
                const existingRoom = this.roomService.getRoomId(socket.id);
                if (existingRoom) {
                    console.log(`[Gateway] User ${socket.id} leaving existing room ${existingRoom} before matching.`);
                    this.handleLeaveRoom(socket, existingRoom);
                }

                await this.matchmakingService.addToQueue(socket.id);

                // Process any pending matches (could be multiple if parallel matching occurred)
                const newMatches = this.matchmakingService.getPendingMatches();

                for (const match of newMatches) {
                    const { roomId, peers } = match;
                    // peers contains [userA, userB]
                    const user1 = peers[0];
                    const user2 = peers[1];

                    console.log(`[Gateway] Processing match: ${user1} <-> ${user2} in Room ${roomId}`);

                    // Create Room in RoomService (syncing with MatchmakingService)
                    this.roomService.createRoom(roomId);

                    // Join both users to room
                    this.roomService.joinRoom(roomId, user1);
                    this.roomService.joinRoom(roomId, user2);

                    const socket1 = this.io.sockets.sockets.get(user1);
                    const socket2 = this.io.sockets.sockets.get(user2);

                    socket1?.join(roomId);
                    socket2?.join(roomId);

                    // Notify both
                    // We arbitrarily choose user1 as initiator for the 1-on-1 handshake
                    this.emitMatchFound(user1, user2, roomId, true);
                    this.emitMatchFound(user2, user1, roomId, false);
                }
            });

            // ---------------- ADD USER (+1) ----------------
            socket.on('add-user', async () => {
                const roomId = this.roomService.getRoomId(socket.id);
                if (!roomId) return;

                const currentParticipants = this.roomService.getRoomParticipants(roomId);
                const newPeerId = await this.matchmakingService.findUserForRoom(roomId, currentParticipants);

                if (newPeerId) {
                    // Add new peer to room
                    this.roomService.joinRoom(roomId, newPeerId);
                    this.io.sockets.sockets.get(newPeerId)?.join(roomId);

                    // Notify new peer they joined a room
                    // They need to know who is already there to initiate connections
                    this.io.to(newPeerId).emit('match-found', {
                        roomId,
                        initiator: false, // They are joining, so they wait for offers? Or mesh logic?
                        // In mesh, usually new joiner initiates to existing, or existing initiate to new.
                        // Let's stick to: New joiner waits for offers from existing participants?
                        // Or better: Existing participants see 'user-joined' and initiate offer to new guy.
                        isPlusOne: true
                    });

                    // Notify existing participants
                    socket.to(roomId).emit('user-joined', { socketId: newPeerId });

                    // Also tell the new guy about existing participants so he can prepare?
                    // Actually, 'user-joined' to existing is enough if existing initiate.
                    // If we want new guy to initiate, we send him the list.
                    // Let's have EXISTING participants initiate to the new guy.
                } else {
                    socket.emit('no-users-found');
                }
            });

            // ---------------- SIGNALING (MESH) ----------------
            // All signaling now goes to specific target, but verified within room

            socket.on('offer', (data) => {
                const { target, sdp } = data;
                const roomId = this.roomService.getRoomId(socket.id);
                if (roomId && this.roomService.getRoomId(target) === roomId) {
                    this.io.to(target).emit('offer', { sender: socket.id, sdp });
                }
            });

            socket.on('answer', (data) => {
                const { target, sdp } = data;
                const roomId = this.roomService.getRoomId(socket.id);
                if (roomId && this.roomService.getRoomId(target) === roomId) {
                    this.io.to(target).emit('answer', { sender: socket.id, sdp });
                }
            });

            socket.on('ice-candidate', (data) => {
                const { target, candidate } = data;
                const roomId = this.roomService.getRoomId(socket.id);
                if (roomId && this.roomService.getRoomId(target) === roomId) {
                    this.io.to(target).emit('ice-candidate', { sender: socket.id, candidate });
                }
            });

            socket.on('user-accepted', (data) => {
                const { target } = data;
                const roomId = this.roomService.getRoomId(socket.id);
                console.log(`[Gateway] User ${socket.id} accepted match in room ${roomId}`);

                if (roomId) {
                    // Tell everyone in the room that I accepted
                    socket.to(roomId).emit('user-accepted', { sender: socket.id });
                    console.log(`[Gateway] Relayed user-accepted from ${socket.id} to room ${roomId}`);
                } else {
                    console.warn(`[Gateway] User ${socket.id} accepted but is not in a room!`);
                }
            });

            // ---------------- LEAVE QUEUE ----------------
            socket.on('leave-queue', () => {
                console.log(`User left queue: ${socket.id}`);
                this.matchmakingService.removeUser(socket.id);
            });

            // ---------------- DISCONNECT ----------------
            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.id}`);
                this.handleDisconnection(socket);
            });
        });
    }

    private async emitMatchFound(socketId: string, peerId: string, roomId: string, initiator: boolean) {
        const peerUserId = this.socketToUserId.get(peerId);
        let peerUser = null;
        if (peerUserId) {
            try {
                peerUser = await UserModel.findById(peerUserId).select('username bio country language');
            } catch (e) { }
        }

        this.io.to(socketId).emit('match-found', {
            roomId,
            peerId,
            initiator,
            reputation: this.userReputations.get(peerId) || 100,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${peerId}`,
            username: peerUser?.username || 'Stranger',
            bio: peerUser?.bio || '',
            country: peerUser?.country || '',
            language: peerUser?.language || ''
        });
    }

    private handleLeaveRoom(socket: Socket, roomId: string) {
        this.roomService.leaveRoom(socket.id);
        socket.leave(roomId);

        // Notify others in room
        socket.to(roomId).emit('user-left', { socketId: socket.id });
    }

    private handleDisconnection(socket: Socket) {
        this.matchmakingService.removeUser(socket.id);

        const roomId = this.roomService.getRoomId(socket.id);
        if (roomId) {
            this.handleLeaveRoom(socket, roomId);
        }

        this.userNames.delete(socket.id);
        const userId = this.socketToUserId.get(socket.id);
        if (userId) this.userIdToSocket.delete(userId);
        this.socketToUserId.delete(socket.id);

        this.io.emit('user-count', this.io.engine.clientsCount);
    }

    // ---------------- REPUTATION LOGIC ----------------
    private updateReputation(userId: string) {
        // ... (Keep existing logic if needed, or simplify)
    }
}

