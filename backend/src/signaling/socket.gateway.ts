// socket.gateway.ts
import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { RoomService } from '../services/room.service';
import Message from '../chat/message.model';
import { UserModel } from '../models/User';
import { ModerationService } from '../microservices/moderation/moderationService';

/**
 * SocketGateway
 *
 * - Ensures recommendation-only flows (no auto-join)
 * - Requires unanimous accept (existing participants + candidate) before adding candidate
 * - Supports expanding rooms up to maxParticipants (9)
 * - Broadcasts queue suggestions to everyone in the queue
 */

export class SocketGateway {
    private io: Server;
    private matchmakingService: MatchmakingService;
    private roomService: RoomService;
    private moderationService: ModerationService;

    // Config
    private recommendationTimeoutMs = 30_000; // 30s to vote
    private maxParticipants = 9; // per your request

    // state maps
    private userStartTimes: Map<string, number> = new Map();
    private userReputations: Map<string, number> = new Map();
    private userNames: Map<string, string> = new Map();
    private socketToUserId: Map<string, string> = new Map();
    private userIdToSocket: Map<string, string> = new Map();

    // recommendation vote states: key = `${roomId}:${candidateId}`
    private pendingRecommendations: Map<string, {
        roomId: string;
        candidateId: string;
        votes: Map<string, 'accept' | 'skip'>; // voter socketId -> vote
        createdAt: number;
        timeoutHandle?: NodeJS.Timeout;
    }> = new Map();

    constructor(io: Server) {
        this.io = io;
        this.matchmakingService = new MatchmakingService();
        this.roomService = new RoomService();
        this.moderationService = new ModerationService();
        this.initialize();
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
                console.log(`User ${userId} mapped to socket ${socket.id}`);
            }

            if (!this.userReputations.has(socket.id)) {
                this.userReputations.set(socket.id, 100);
            }

            this.io.emit('user-count', this.io.engine.clientsCount);

            // ---------- Basic Queries ----------
            socket.on('get-online-users', () => {
                const users: any[] = [];
                for (const [id] of this.io.sockets.sockets) {
                    users.push({
                        id,
                        userId: this.socketToUserId.get(id),
                        displayName: this.userNames.get(id) || `User ${id.slice(0, 6)}`,
                        reputation: this.userReputations.get(id) || 100
                    });
                }
                socket.emit('online-users-list', users);
            });

            // ---------- Matchmaking (queue) ----------
            socket.on('find-match', async () => {
    console.log(`[Gateway] ${socket.id} requested find-match`);

    const currentRoom = this.roomService.getRoomId(socket.id);

    // If already in a call → DO NOT leave, DO NOT requeue, DO NOT match again
    if (currentRoom) {
        console.log(`[Gateway] ${socket.id} is already in room ${currentRoom}, ignoring find-match`);
        return;
    }

    // User is NOT in a room → Add to queue
    await this.matchmakingService.addToQueue(socket.id);

    // Check for auto matches (pairing)
    const newMatches = this.matchmakingService.getPendingMatches();
    for (const match of newMatches) {
        const { roomId, peers } = match;

        this.roomService.createRoom(roomId);
        peers.forEach(pid => {
            this.roomService.joinRoom(roomId, pid);
            this.io.sockets.sockets.get(pid)?.join(roomId);
        });

       // NOTIFY BOTH USERS
const userA = await this._publicUser(peers[0]);
const userB = await this._publicUser(peers[1]);

// Tell A that B joined
this.io.to(peers[0]).emit('user-joined', userB);

// Tell B that A joined
this.io.to(peers[1]).emit('user-joined', userA);

    }

    // After match or no match → show queue recommendations
    await this.broadcastQueueRecommendations();
});


            socket.on('leave-queue', async () => {
                console.log(`[Gateway] ${socket.id} leave-queue`);
                this.matchmakingService.removeUser(socket.id);
                await this.broadcastQueueRecommendations();
            });

            // ---------- Connect recommendation (explicit connect click) ----------
            // This event is used when a user clicks "Connect" from suggestions:
            // - If initiator is idle and target is idle -> create provisional vote for both
            // - If initiator is in a room and target is idle -> initiate recommendation for that room
            socket.on('connect-recommendation', async (data: { peerId: string, roomId?: string }) => {
                const { peerId, roomId: providedRoomId } = data;
                const initiatorRoom = this.roomService.getRoomId(socket.id);
                const targetRoom = this.roomService.getRoomId(peerId);

                // If initiator supplied a roomId explicitly, honor it
                const effectiveRoomId = providedRoomId || initiatorRoom || targetRoom;

                // If this is an initiation from an active room (initator in a room), treat it as a room recommendation:
                if (initiatorRoom && !targetRoom) {
                    // the initiator is inside a room and wants to invite an idle user (peerId)
                    await this.startRecommendationForRoom(initiatorRoom, peerId);
                    return;
                }

                // If both idle -> create a provisional room and recommend each other (two-person connection request)
                if (!initiatorRoom && !targetRoom) {
                    // We'll create a provisional room that holds the two as "pending". Vote must be accepted by both.
                    const provisionalRoomId = crypto.randomUUID();
                    this.roomService.createRoom(provisionalRoomId);

                    // Add initiator to provisional room to show waiting state
                    this.roomService.joinRoom(provisionalRoomId, socket.id);
                    socket.join(provisionalRoomId);

                    // Initialize pending recommendation votes for target as candidate for that provisionalRoom
                    this.createPendingRecommendation(provisionalRoomId, peerId, [socket.id]);

                    // Send incoming recommendation to target
                    const initiatorPublic = await this._publicUser(socket.id);
                    this.io.to(peerId).emit('recommendation-received', {
                        type: 'incoming',
                        user: initiatorPublic,
                        roomId: provisionalRoomId
                    });

                    // Inform initiator that we're waiting (outgoing)
                    this.io.to(socket.id).emit('recommendation-received', {
                        type: 'outgoing',
                        users: [initiatorPublic],
                        roomId: provisionalRoomId
                    });

                    return;
                }

                // If initiator idle and target in a room -> treat as joining that room as candidate
                if (!initiatorRoom && targetRoom) {
                    await this.startRecommendationForRoom(targetRoom, socket.id);
                    return;
                }

                // If both are in rooms (rare) -> we won't auto-join cross-room
                socket.emit('recommendation-ended', { reason: 'invalid-state' });
            });

            // ---------- Add user (explicit "Add Random User" from inside a room) ----------
            // This will pick a candidate (idle) and start a recommendation process for the room.
            socket.on('add-user', async () => {
                const roomId = this.roomService.getRoomId(socket.id);
                if (!roomId) {
                    socket.emit('no-users-found');
                    return;
                }
                await this.startRecommendationForRoom(roomId);
            });

            // ---------- Recommendation action (voting) ----------
            // payload: { action: 'accept' | 'skip', recommendedPeerId: string, roomId: string }
            socket.on('recommendation-action', async (data: { action: 'accept' | 'skip', recommendedPeerId: string, roomId: string }) => {
                const { action, recommendedPeerId, roomId } = data;
                const key = this.getRecKey(roomId, recommendedPeerId);
                const pending = this.pendingRecommendations.get(key);

                if (!pending) {
                    console.log(`[Gateway] Vote for unknown recommendation ${key} by ${socket.id}`);
                    socket.emit('recommendation-ended', { reason: 'invalid-recommendation' });
                    return;
                }

                // ensure only room participants or candidate can vote
                const participants = this.roomService.getRoomParticipants(roomId) || [];
                const allowed = new Set([...participants, pending.candidateId]);
                if (!allowed.has(socket.id)) {
                    socket.emit('recommendation-ended', { reason: 'not-authorized' });
                    return;
                }

                if (action === 'skip') {
                    // immediate veto
                    this.endRecommendationAsSkipped(key, socket.id);
                    return;
                }

                // accept -> record
                pending.votes.set(socket.id, 'accept');

                // Check consensus: all current participants + candidate must accept
                const requiredVoters = [...participants, pending.candidateId];
                const allAccepted = requiredVoters.every(id => pending.votes.get(id) === 'accept');

                if (allAccepted) {
                    // ensure room capacity
                    if (participants.length + 1 > this.maxParticipants) {
                        // cannot add due to room capacity
                        this.endRecommendationAsSkipped(key, socket.id, 'room-full');
                        return;
                    }

                    // Finalize join (now add candidate to room)
                    await this.finalizeRecommendationJoin(key);
                    return;
                }

                // If not all accepted yet, optionally ack partial vote
                socket.emit('recommendation-vote-ack', { roomId, recommendedPeerId, by: socket.id, action });
            });

            // ---------- Skip recommendation (room peer asks for new suggestion) ----------
            // payload: { roomId }
            socket.on('skip-recommendation', async (data: { roomId?: string }) => {
                const rId = data?.roomId || this.roomService.getRoomId(socket.id);
                if (!rId) return;
                // If there's a pending rec for this room, skip it
                // Find pending by roomId
                for (const [k, v] of this.pendingRecommendations.entries()) {
                    if (v.roomId === rId) {
                        this.endRecommendationAsSkipped(k, socket.id);
                        return;
                    }
                }
                // Otherwise issue a fresh recommendation
                await this.broadcastNewRecommendation(rId);
            });

            // ---------- Skip as candidate (outsider) ----------
            // payload: { roomId }
            socket.on('skip-recommendation-target', async (data: { roomId: string }) => {
                const { roomId } = data;
                if (!roomId) return;
                // candidate skipped -> end and ask room for new suggestion
                for (const [k, v] of this.pendingRecommendations.entries()) {
                    if (v.roomId === roomId && v.candidateId === socket.id) {
                        this.endRecommendationAsSkipped(k, socket.id);
                        return;
                    }
                }
                // nothing found
            });

            // ---------- Signaling ---------- (only allowed within same room)
           // ---------------- SAFE SIGNALING (PREVENT WRONG-STATE ERRORS) ----------------
socket.on("offer", ({ target, sdp }) => {
    const roomId = this.roomService.getRoomId(socket.id);

    // Block if either peer not in same room
    if (!roomId || this.roomService.getRoomId(target) !== roomId) return;

    this.io.to(target).emit("offer", { sender: socket.id, sdp });
});

socket.on("answer", ({ target, sdp }) => {
    const roomId = this.roomService.getRoomId(socket.id);

    if (!roomId || this.roomService.getRoomId(target) !== roomId) return;

    this.io.to(target).emit("answer", { sender: socket.id, sdp });
});

socket.on("ice-candidate", ({ target, candidate }) => {
    const roomId = this.roomService.getRoomId(socket.id);

    if (!roomId || this.roomService.getRoomId(target) !== roomId) return;

    this.io.to(target).emit("ice-candidate", { sender: socket.id, candidate });
});


            // ---------- Accept in-room match (used for initial 1v1 matching acceptance) ----------
            socket.on('user-accepted', (data: { target?: string }) => {
                const roomId = this.roomService.getRoomId(socket.id);
                if (roomId) {
                    socket.to(roomId).emit('user-accepted', { sender: socket.id });
                }
            });

            // ---------- Disconnect ----------
            socket.on('disconnect', async () => {
                console.log(`User disconnected: ${socket.id}`);
                await this.handleDisconnection(socket);
                await this.broadcastQueueRecommendations();
                this.io.emit('user-count', this.io.engine.clientsCount);
            });
        });
    }

    // ========== Helper Methods ==========

    private getRecKey(roomId: string, candidateId: string) {
        return `${roomId}:${candidateId}`;
    }

    private async _publicUser(socketId: string) {
        // return lightweight user object for UI
        const userId = this.socketToUserId.get(socketId);
        let dbUser = null;
        if (userId) {
            try {
                dbUser = await UserModel.findById(userId).select('username bio country language avatarUrl');
            } catch (e) {
                dbUser = null;
            }
        }
        return {
            peerId: socketId,
            displayName: this.userNames.get(socketId) || `User-${socketId.slice(0, 6)}`,
            username: dbUser?.username || `u${socketId.slice(0, 6)}`,
            avatarUrl: dbUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${socketId}`,
            bio: dbUser?.bio || '',
            country: dbUser?.country || '',
            language: dbUser?.language || ''
        };
    }

    // startRecommendationForRoom(roomId, candidateOverride?)
    // If candidateOverride provided -> use that candidate
    // Otherwise, matchmakingService will pick an idle candidate
    private async startRecommendationForRoom(roomId: string, candidateOverride?: string) {
        const currentParticipants = this.roomService.getRoomParticipants(roomId) || [];

        // If room full -> send no-users-found
        if (currentParticipants.length >= this.maxParticipants) {
            this.io.in(roomId).emit('recommendation-ended', { reason: 'room-full' });
            return;
        }

        // choose candidate
        let candidateId: string | null = null;
        if (candidateOverride) {
            candidateId = candidateOverride;
        } else {
            candidateId = await this.matchmakingService.findPeerForRecommendation(roomId, currentParticipants);
        }

        if (!candidateId) {
            this.io.in(roomId).emit('no-users-found');
            return;
        }

        // sanity: candidate must not be in any active room already
        if (this.roomService.getRoomId(candidateId)) {
            this.io.in(roomId).emit('recommendation-ended', { reason: 'candidate-busy' });
            return;
        }

        // Build recommendation payloads
        const candidatePublic = await this._publicUser(candidateId);

        // 1) Emit to existing participants (incoming)
        this.io.in(roomId).emit('recommendation-received', {
            type: 'incoming',
            user: candidatePublic,
            roomId
        });

        // 2) Emit to candidate (outgoing) with list of existing participants
        const existingDetails = [];
        for (const pid of currentParticipants) {
            existingDetails.push(await this._publicUser(pid));
        }

        this.io.to(candidateId).emit('recommendation-received', {
            type: 'outgoing',
            users: existingDetails,
            roomId
        });

        // 3) Initialize pending recommendation votes
        const key = this.getRecKey(roomId, candidateId);
        this.createPendingRecommendation(key, candidateId, currentParticipants);
    }

    private createPendingRecommendation(keyRaw: string, candidateId: string, participantIds: string[]) {
        // keyRaw could be either roomId or full key; normalize to full key
        let key = keyRaw;
        let roomId = keyRaw;
        if (keyRaw.includes(':')) {
            const parts = keyRaw.split(':');
            roomId = parts[0];
            // key is fine
        } else {
            // if given roomId alone, compose key
            key = `${roomId}:${candidateId}`;
        }

        // Prevent duplicate pending
        if (this.pendingRecommendations.has(key)) {
            return;
        }

        const pending = {
            roomId,
            candidateId,
            votes: new Map<string, 'accept' | 'skip'>(),
            createdAt: Date.now(),
            timeoutHandle: undefined as unknown as NodeJS.Timeout
        } as {
            roomId: string;
            candidateId: string;
            votes: Map<string, 'accept' | 'skip'>;
            createdAt: number;
            timeoutHandle?: NodeJS.Timeout;
        };

        // Optionally pre-fill votes: none yet
        this.pendingRecommendations.set(key, pending);

        // Start timeout to auto-skip if not decided
        const handle = setTimeout(() => {
            if (this.pendingRecommendations.has(key)) {
                this.endRecommendationAsSkipped(key, 'timeout');
            }
        }, this.recommendationTimeoutMs);

        pending.timeoutHandle = handle;
    }

    private async endRecommendationAsSkipped(key: string, by: string | undefined = undefined, reason: string = 'skipped') {
        const pending = this.pendingRecommendations.get(key);
        if (!pending) return;

        // notify everyone involved (room participants + candidate)
        const participants = this.roomService.getRoomParticipants(pending.roomId) || [];
        const notify = new Set([...participants, pending.candidateId]);
        for (const sid of notify) {
            this.io.to(sid).emit('recommendation-ended', { reason, by });
        }

        // clear timeout & state
        if (pending.timeoutHandle) clearTimeout(pending.timeoutHandle);
        this.pendingRecommendations.delete(key);

        // Trigger new recommendation for the room if this skip was requested by a participant
        // and room still has participants
        if (reason !== 'room-full' && participants.length > 0) {
            // Slight delay to avoid immediate churn
            setTimeout(() => this.broadcastNewRecommendation(pending.roomId), 300);
        }
    }

    // Finalize the unanimous accept and join the candidate into the room
    private async finalizeRecommendationJoin(key: string) {
        const pending = this.pendingRecommendations.get(key);
        if (!pending) return;

        const { roomId, candidateId } = pending;
        const participantsBefore = this.roomService.getRoomParticipants(roomId) || [];

        // Re-check capacity
        if (participantsBefore.length + 1 > this.maxParticipants) {
            await this.endRecommendationAsSkipped(key, undefined, 'room-full');
            return;
        }

        // Now perform the join (this is the only place we join candidate)
        this.roomService.joinRoom(roomId, candidateId);
        const candidateSocket = this.io.sockets.sockets.get(candidateId);
        candidateSocket?.join(roomId);

        // Notify room of the new user-joined (so frontends create video tile and start negotiation)
        const newPeerPublic = await this._publicUser(candidateId);
        this.io.to(roomId).emit('user-joined', newPeerPublic);

        // Notify everyone that recommendation succeeded
        const notify = new Set([...participantsBefore, candidateId]);
        for (const sid of notify) {
            this.io.to(sid).emit('recommendation-ended', { reason: 'accepted', roomId });
        }

        // Clear pending state
        if (pending.timeoutHandle) clearTimeout(pending.timeoutHandle);
        this.pendingRecommendations.delete(key);
    }

    // broadcast queue suggestions to every queued user (so everyone in queue sees who else is available)
    private async broadcastQueueRecommendations() {
        const queue = this.matchmakingService.getQueue(); // array of socketIds
        for (const targetSocketId of queue) {
            // suggestions: other queued users (excluding target)
            const suggestions = queue.filter(id => id !== targetSocketId).slice(0, 8); // max 8 suggestions
            const suggestionsDetails = [];
            for (const sId of suggestions) {
                suggestionsDetails.push(await this._publicUser(sId));
            }

            this.io.to(targetSocketId).emit('recommendation-received', {
                type: 'outgoing',
                users: suggestionsDetails
            });
        }
    }

    // broadcast a new recommendation for a room (used on skip)
    private async broadcastNewRecommendation(roomId: string) {
        const participants = this.roomService.getRoomParticipants(roomId) || [];
        // pick new candidate
        const candidateId = await this.matchmakingService.findPeerForRecommendation(roomId, participants);
        if (!candidateId) {
            this.io.in(roomId).emit('no-users-found');
            return;
        }

        // if candidate busy, skip
        if (this.roomService.getRoomId(candidateId)) {
            this.io.in(roomId).emit('recommendation-ended', { reason: 'candidate-busy' });
            return;
        }

        const candidatePublic = await this._publicUser(candidateId);

        // emit incoming to participants
        this.io.in(roomId).emit('recommendation-received', {
            type: 'incoming',
            user: candidatePublic,
            roomId
        });

        // emit outgoing to candidate
        const existingDetails = [];
        for (const pid of participants) {
            existingDetails.push(await this._publicUser(pid));
        }
        this.io.to(candidateId).emit('recommendation-received', {
            type: 'outgoing',
            users: existingDetails,
            roomId
        });

        // set pending state
        const key = this.getRecKey(roomId, candidateId);
        this.createPendingRecommendation(key, candidateId, participants);
    }

    // finalize join helper (used by connect-recommendation when someone directly clicks connect on idle -> we start rec for room)
    private async executeJoin(roomId: string, socketId: string) {
        // quick guard: ensure not already in room and capacity
        const current = this.roomService.getRoomParticipants(roomId) || [];
        if (current.includes(socketId)) return;
        if (current.length + 1 > this.maxParticipants) {
            this.io.to(socketId).emit('recommendation-ended', { reason: 'room-full' });
            return;
        }
        this.roomService.joinRoom(roomId, socketId);
        const sock = this.io.sockets.sockets.get(socketId);
        sock?.join(roomId);

        const newPeerPublic = await this._publicUser(socketId);
        this.io.to(roomId).emit('user-joined', newPeerPublic);
    }

    // handle leave room cleanup
    private handleLeaveRoom(socket: Socket, roomId: string) {
        // remove from room service
        try {
            this.roomService.leaveRoom(roomId, socket.id);
        } catch (e) {
            // ignore if not present
        }
        socket.leave(roomId);

        const remaining = this.roomService.getRoomParticipants(roomId) || [];
        if (remaining.length < 2) {
            // end call for the last participant(s)
            for (const sid of remaining) {
                this.io.to(sid).emit('call-ended', { reason: 'Partner disconnected' });
                try { this.roomService.removeRoom(roomId); } catch (e) { }
            }
        } else {
            // notify others
            socket.to(roomId).emit('user-left', { socketId: socket.id });
        }

        // remove any pending recommendations tied to this room
        for (const [k, v] of this.pendingRecommendations.entries()) {
            if (v.roomId === roomId) {
                this.endRecommendationAsSkipped(k, 'room-closed', 'skipped');
            }
        }
    }

    private async handleDisconnection(socket: Socket) {
        const roomId = this.roomService.getRoomId(socket.id);
        if (roomId) {
            this.handleLeaveRoom(socket, roomId);
        } else {
            // Remove from queue if present
            this.matchmakingService.removeUser(socket.id);
        }

        this.userNames.delete(socket.id);
        const userId = this.socketToUserId.get(socket.id);
        if (userId) this.userIdToSocket.delete(userId);
        this.socketToUserId.delete(socket.id);

        // clear any pending recommendations where this socket was candidate or voter
        for (const [k, v] of this.pendingRecommendations.entries()) {
            if (v.candidateId === socket.id) {
                this.endRecommendationAsSkipped(k, socket.id, 'candidate-disconnected');
            } else if (v.votes.has(socket.id)) {
                // treat as skip if a voter disconnected
                this.endRecommendationAsSkipped(k, socket.id, 'voter-disconnected');
            }
        }
    }
}
