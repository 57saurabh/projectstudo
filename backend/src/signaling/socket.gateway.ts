// socket.gateway.ts
import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { RoomService } from '../services/room.service';
import { UserModel } from '../models/User';
import { ModerationService } from '../microservices/moderation/moderationService';
import { MatchProposal } from '../models/MatchProposal';

/**
 * SocketGateway (Online-Only, Intent-Based, MongoDB)
 * 
 * Migrated from Redis.
 * Uses 'MatchProposal' document for voting state.
 */

export class SocketGateway {
  private io: Server;
  private matchmakingService: MatchmakingService;
  private roomService: RoomService;
  private moderationService: ModerationService;

  // Local user cache
  private userNames: Map<string, string> = new Map();
  private socketToUserId: Map<string, string> = new Map();
  private userIdToSocket: Map<string, string> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.matchmakingService = new MatchmakingService();
    this.roomService = new RoomService();
    this.moderationService = new ModerationService();

    this.initialize();
  }

  private initialize() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[SocketGateway] connected ${socket.id}`);
      this.handleConnection(socket);

      socket.on('set-online', () => this.handleSetOnline(socket));
      socket.on('set-offline', () => this.handleSetOffline(socket)); // Manual "Stop" button
      socket.on('get-recommendations', () => this.handleGetRecommendations(socket));

      // Intent to connect
      socket.on('request-connection', (data) => this.handleRequestConnection(socket, data));

      // Voting (for group join or 1v1 proposal)
      socket.on('vote-entry', (data) => this.handleVoteEntry(socket, data));
      socket.on('recommendation-action', (data) => this.handleProposalVote(socket, data));


      // Signaling
      socket.on('offer', (d) => this.passSignal(socket, 'offer', d));
      socket.on('answer', (d) => this.passSignal(socket, 'answer', d));
      socket.on('ice-candidate', (d) => this.passSignal(socket, 'ice-candidate', d));

      // Actions
      socket.on('leave-room', () => this.handleLeaveRoom(socket));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  private handleConnection(socket: Socket) {
    const { username, userId, displayName } = socket.handshake.query as any;
    this.userNames.set(socket.id, username || displayName || 'Anonymous');
    if (userId) {
      this.socketToUserId.set(socket.id, userId);
      this.userIdToSocket.set(userId, socket.id);
    }
  }

  // 1. User declares they are available
  private async handleSetOnline(socket: Socket) {
    const currentRoom = await this.roomService.getRoomId(socket.id);
    if (currentRoom) {
      console.log(`[SocketGateway] ${socket.id} tried set-online but is in room ${currentRoom}`);
      return;
    }
    await this.matchmakingService.setOnline(socket.id);
    this.attemptAutoMatch(socket);
  }

  private async handleSetOffline(socket: Socket) {
    await this.matchmakingService.setOffline(socket.id);
    this.handleLeaveRoom(socket);
  }

  // 2. Fetch recommendations (Now internal mainly)
  private async handleGetRecommendations(socket: Socket) {
    // Legacy support or fallback
    const state = await this.matchmakingService.getUserState(socket.id);
    if (state !== 'ONLINE') return;

    const candidates = await this.matchmakingService.getRecommendations(socket.id, 5);
    const enriched = await Promise.all(candidates.map(id => this._publicUser(id)));
    socket.emit('recommendations-list', enriched);
  }

  // AUTO-MATCH LOGIC
  private async attemptAutoMatch(socket: Socket) {
    const seekerId = socket.id;
    console.log(`[SocketGateway] Attempting auto-match for ${seekerId}`);

    // Get 1 random candidate
    const candidates = await this.matchmakingService.getRecommendations(seekerId, 1);

    if (candidates.length > 0) {
      const targetId = candidates[0];
      console.log(`[SocketGateway] Auto-match found: ${seekerId} -> ${targetId}`);
      await this._createProposal(seekerId, targetId);
    } else {
      console.log(`[SocketGateway] No candidates for ${seekerId}. Waiting...`);
      // Maybe emit a "waiting" status?
      socket.emit('recommendations-list', []);
    }
  }

  // 3. Request Connection (Manual or Auto)
  private async handleRequestConnection(socket: Socket, data: { targetPeerId: string }) {
    await this._createProposal(socket.id, data.targetPeerId);
  }

  // Shared Proposal Logic
  private async _createProposal(seekerId: string, targetId: string) {
    if (seekerId === targetId) return;

    // Check online status first (optimistic check)
    const seekerState = await this.matchmakingService.getUserState(seekerId);
    const targetState = await this.matchmakingService.getUserState(targetId);

    if (seekerState !== 'ONLINE') return;
    if (!targetState || targetState !== 'ONLINE') return;

    // ATOMIC RESERVATION - DETERMINISTIC ORDER (Avoid Deadlocks)
    // Always lock the "Lower ID" first, then "Higher ID".
    // This ensures that if A and B try to match each other, they both fight for the same first lock.
    const [firstId, secondId] = [seekerId, targetId].sort();

    const reservedFirst = await this.matchmakingService.reserveUser(firstId);
    if (!reservedFirst) {
      console.log(`[SocketGateway] Failed to reserve ${firstId} (First Lock). Match aborted.`);
      // If the seeker was the one who failed (and they initiated), we might want to tell them?
      // But usually this just means they were grabbed by someone else.
      return;
    }

    const reservedSecond = await this.matchmakingService.reserveUser(secondId);
    if (!reservedSecond) {
      console.log(`[SocketGateway] Failed to reserve ${secondId} (Second Lock). Rolling back ${firstId}.`);
      await this.matchmakingService.setOnline(firstId); // Rollback first
      return;
    }

    // Both locked successfully! Proceed.
    const roomId = crypto.randomUUID();
    const proposalId = `proposal:${roomId}`;

    // MongoDB Proposal (TTL 30s initial)
    await MatchProposal.create({
      proposalId,
      roomId,
      participants: [seekerId, targetId],
      votes: {},
      expiresAt: new Date(Date.now() + 30000)
    });

    const seekerMeta = await this._publicUser(seekerId);
    const targetMeta = await this._publicUser(targetId);

    this.io.to(seekerId).emit('proposal-received', {
      type: 'outgoing',
      roomId,
      candidate: targetMeta,
      keyId: targetId,
      participants: [seekerMeta, targetMeta]
    });

    this.io.to(targetId).emit('proposal-received', {
      type: 'incoming',
      roomId,
      candidate: seekerMeta,
      keyId: seekerId,
      participants: [seekerMeta, targetMeta]
    });
  }

  // 4. Voting Logic
  private async handleVoteEntry(socket: Socket, data: { voteId: string, roomId: string, decision: 'accept' | 'skip' }) {
    this.handleProposalVote(socket, { action: data.decision, roomId: data.roomId, recommendedPeerId: data.voteId });
  }

  // Handle votes (accept / skip)
  private async handleProposalVote(socket: Socket, data: { action: 'accept' | 'skip' | 'decline', recommendedPeerId: string, roomId: string }) {
    const { action, roomId } = data;
    const proposalId = `proposal:${roomId}`;

    // Fetch Proposal
    const proposal = await MatchProposal.findOne({ proposalId });

    // Explicit Lazy Expiration Check
    if (!proposal || proposal.expiresAt.getTime() < Date.now()) {
      if (proposal) await MatchProposal.deleteOne({ _id: proposal._id }); // cleanup
      socket.emit('recommendation-ended', { reason: 'timeout' });
      return;
    }

    // Authorization
    if (!proposal.participants.includes(socket.id)) return;

    if (action === 'skip' || action === 'decline') {
      console.log(`[SocketGateway] ${socket.id} REJECTED proposal ${roomId}`);
      await MatchProposal.deleteOne({ proposalId });

      // Notify and Requeue all participants
      proposal.participants.forEach(async (pid) => {
        this.io.to(pid).emit('recommendation-ended', { reason: 'declined', by: socket.id });
        await this.matchmakingService.setOnline(pid);

        // Trigger auto-match for each person
        const peerSocket = this.io.sockets.sockets.get(pid);
        if (peerSocket) {
          this.attemptAutoMatch(peerSocket);
        }
      });
      return;
    }

    if (action === 'accept') {
      proposal.votes.set(socket.id, 'accept');
      await proposal.save();

      const voteCount = proposal.votes.size;

      if (voteCount === 1) {
        // First accept: Shorten timeout to 10s
        proposal.expiresAt = new Date(Date.now() + 10000);
        await proposal.save();

        console.log(`[SocketGateway] First accept for ${roomId}. Timeout shortened to 10s.`);
        socket.emit('recommendation-vote-ack', { status: 'waiting' });

        // Safety check for timeout in case 2nd person never replies
        setTimeout(async () => {
          const pCheck = await MatchProposal.findOne({ proposalId });
          if (pCheck && pCheck.expiresAt.getTime() < Date.now()) {
            console.log(`[SocketGateway] Proposal ${roomId} timed out (safety check).`);
            await MatchProposal.deleteOne({ proposalId });

            pCheck.participants.forEach(async (pid) => {
              this.io.to(pid).emit('recommendation-ended', { reason: 'timeout' });
              // Reset if needed
              const s = await this.matchmakingService.getUserState(pid);
              if (s === 'BUSY') {
                await this.matchmakingService.setOnline(pid);
                const ps = this.io.sockets.sockets.get(pid);
                if (ps) this.attemptAutoMatch(ps);
              }
            });
          }
        }, 11000); // Check slightly after expiration

      } else if (voteCount >= proposal.participants.length) {
        // All accepted
        console.log(`[SocketGateway] All accepted ${roomId}. Creating room.`);

        await MatchProposal.deleteOne({ proposalId });
        await this.roomService.createRoom(roomId, proposal.participants);

        const peers = await Promise.all(proposal.participants.map(id => this._publicUser(id)));

        proposal.participants.forEach((pid) => {
          const otherPeers = peers.filter(p => p.peerId !== pid);
          this.io.to(pid).emit('room-created', { roomId, peers: otherPeers });
          this.io.to(pid).emit('recommendation-ended', { reason: 'accepted' });
        });
      }
    }
  }

  private async passSignal(socket: Socket, event: string, data: any) {
    const target = data.target;
    this.io.to(target).emit(event, { sender: socket.id, ...data });
  }

  private async handleLeaveRoom(socket: Socket) {
    const roomId = await this.roomService.getRoomId(socket.id);
    if (roomId) {
      await this.roomService.removeUserFromRoom(roomId, socket.id);
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', { socketId: socket.id });

      // Go back online and search
      await this.matchmakingService.setOnline(socket.id);
      this.attemptAutoMatch(socket);
    }
  }

  private async handleDisconnect(socket: Socket) {
    await this.matchmakingService.setOffline(socket.id);
    await this.handleLeaveRoom(socket);

    this.userNames.delete(socket.id);
    const uid = this.socketToUserId.get(socket.id);
    if (uid) {
      this.userIdToSocket.delete(uid);
      this.socketToUserId.delete(socket.id);
    }
  }

  private async _publicUser(socketId: string) {
    const userId = this.socketToUserId.get(socketId);
    let dbUser = null;
    if (userId) {
      try {
        dbUser = await UserModel.findById(userId).select('username avatarUrl');
      } catch (e) { dbUser = null; }
    }
    return {
      peerId: socketId,
      username: dbUser?.username || `User-${socketId.slice(0, 4)}`,
      avatarUrl: dbUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${socketId}`,
    };
  }
}
