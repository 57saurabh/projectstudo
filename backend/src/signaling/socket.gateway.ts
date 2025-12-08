// socket.gateway.ts
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { RoomService } from '../services/room.service';
import Message from '../chat/message.model';
import { UserModel } from '../models/User';
import { ModerationService } from '../microservices/moderation/moderationService';

/**
 * SocketGateway (Redis-backed, OPTION 1)
 *
 * - Uses MatchmakingService + RoomService backed by Redis
 * - Pending proposals stored in Redis: pending:{roomId}:{candidateId} (EX).
 * - Votes stored in Redis hash: votes:{roomId}:{candidateId}
 * - Inflight key: inflight:{roomId}:{candidateId}
 *
 * Logging is verbose so you can monitor server console for each step.
 */

// Types for local mirrors
type PendingLocal = {
  roomId: string;
  candidateId: string;
  allowedVoters: Set<string>;
  timeoutHandle?: NodeJS.Timeout;
};

export class SocketGateway {
  private io: Server;
  private redis: Redis.Redis;
  private redisSub: Redis.Redis;
  private matchmakingService: MatchmakingService;
  private roomService: RoomService;
  private moderationService: ModerationService;

  // config
  private recommendationTimeoutMs = 30_000;
  private maxParticipants = 10;

  // local maps
  private userNames: Map<string, string> = new Map();
  private socketToUserId: Map<string, string> = new Map();
  private userIdToSocket: Map<string, string> = new Map();

  // local mirror of pending proposals (fast checks)
  private localPending: Map<string, PendingLocal> = new Map();

  constructor(io: Server) {
    this.io = io;
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.redis = new Redis(redisUrl);
    this.redisSub = new Redis(redisUrl);

    this.matchmakingService = new MatchmakingService(redisUrl);
    this.roomService = new RoomService(redisUrl);
    this.moderationService = new ModerationService();

    this.redis.on('error', (e) => console.error('[SocketGateway][Redis] error', e));
    this.redisSub.on('error', (e) => console.error('[SocketGateway][RedisSub] error', e));

    console.log('[SocketGateway] connected to Redis at', redisUrl);

    this.setupRedisKeyspaceListener().catch((e) => console.error('[SocketGateway] setup redis listener failed', e));
    this.initialize();
  }

  // Subscribe to Redis keyspace expirations for pending proposals
  private async setupRedisKeyspaceListener() {
    // make sure Redis server has `notify-keyspace-events Ex` set
    const expiredChannel = `__keyevent@0__:expired`;
    await this.redisSub.subscribe(expiredChannel);
    console.log('[SocketGateway] subscribed to Redis expired events on', expiredChannel);
    this.redisSub.on('message', (channel, message) => {
      if (channel === expiredChannel && message.startsWith('pending:')) {
        // pending:{roomId}:{candidateId}
        const rest = message.slice('pending:'.length);
        const idx = rest.indexOf(':');
        if (idx > 0) {
          const roomId = rest.slice(0, idx);
          const candidateId = rest.slice(idx + 1);
          const key = `${roomId}:${candidateId}`;
          console.log(`[SocketGateway] pending expired for ${key}`);
          this.endRecommendationAsSkipped(key, 'timeout', 'timeout').catch((e) => console.error('timeout cleanup err', e));
        }
      }
    });
  }

  private initialize() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[SocketGateway] socket connected ${socket.id}`);

      const displayName = socket.handshake.query.displayName as string;
      const username = socket.handshake.query.username as string;
      const userId = socket.handshake.query.userId as string;

      this.userNames.set(socket.id, username || displayName || 'Stranger');
      if (userId) {
        this.socketToUserId.set(socket.id, userId);
        this.userIdToSocket.set(userId, socket.id);
        console.log(`[SocketGateway] mapped userId ${userId} -> socket ${socket.id}`);
      }

      this.io.emit('user-count', this.io.engine.clientsCount);

      // get-online-users (debug)
      socket.on('get-online-users', async () => {
        const q = await this.matchmakingService.getQueue();
        socket.emit('online-users-list', q);
        console.log(`[SocketGateway] sent online-users-list to ${socket.id}`);
      });

      // find-match (user)
      socket.on('find-match', async () => {
        console.log(`[SocketGateway] find-match requested by ${socket.id}`);
        const currentRoom = await this.roomService.getRoomId(socket.id);
        if (currentRoom) {
          console.log(`[SocketGateway] ${socket.id} already in room ${currentRoom} - ignoring find-match`);
          return;
        }
        await this.matchmakingService.addToQueue(socket.id, 'user');
        await this.attemptMatch(socket.id, 'user');
      });

      // leave-queue
      socket.on('leave-queue', async () => {
        console.log(`[SocketGateway] leave-queue ${socket.id}`);
        await this.matchmakingService.removeFromQueue(socket.id);
      });

      // add-user (room expansion)
      socket.on('add-user', async () => {
        const roomId = await this.roomService.getRoomId(socket.id);
        if (!roomId) {
          socket.emit('no-users-found');
          return;
        }
        console.log(`[SocketGateway] room ${roomId} requested add-user by ${socket.id}`);
        await this.matchmakingService.addToQueue(roomId, 'room');
        await this.attemptMatch(roomId, 'room');
      });

      // recommendation actions
      socket.on('recommendation-action', async (data: { action: 'accept' | 'skip', recommendedPeerId: string, roomId: string }, ack?: (res: any) => void) => {
        console.log(`[SocketGateway] recommendation-action from ${socket.id}`, data);
        if (ack) ack({ status: 'received', from: socket.id });
        await this.handleProposalVote(socket, data);
      });

      // signaling events - only within same room
      socket.on('offer', async ({ target, sdp }) => {
        const roomA = await this.roomService.getRoomId(socket.id);
        const roomB = await this.roomService.getRoomId(target);
        if (!roomA || roomA !== roomB) return;
        this.io.to(target).emit('offer', { sender: socket.id, sdp });
      });

      socket.on('answer', async ({ target, sdp }) => {
        const roomA = await this.roomService.getRoomId(socket.id);
        const roomB = await this.roomService.getRoomId(target);
        if (!roomA || roomA !== roomB) return;
        this.io.to(target).emit('answer', { sender: socket.id, sdp });
      });

      socket.on('ice-candidate', async ({ target, candidate }) => {
        const roomA = await this.roomService.getRoomId(socket.id);
        const roomB = await this.roomService.getRoomId(target);
        if (!roomA || roomA !== roomB) return;
        this.io.to(target).emit('ice-candidate', { sender: socket.id, candidate });
      });

      // next (explicit leave + requeue)
      socket.on('next', async () => {
        console.log(`[SocketGateway] next pressed by ${socket.id}`);
        const roomId = await this.roomService.getRoomId(socket.id);
        if (!roomId) {
          await this.matchmakingService.addToQueue(socket.id, 'user');
          await this.attemptMatch(socket.id, 'user');
          return;
        }
        await this.handleLeaveRoom(socket, roomId, { action: 'next' });
      });

      // disconnect
      socket.on('disconnect', async () => {
        console.log(`[SocketGateway] socket disconnected ${socket.id}`);
        await this.handleDisconnection(socket);
        this.io.emit('user-count', this.io.engine.clientsCount);
      });
    });
  }

  // helper: pending redis key
  private pendingRedisKey(roomId: string, candidateId: string) {
    return `pending:${roomId}:${candidateId}`;
  }
  private votesKey(roomId: string, candidateId: string) {
    return `votes:${roomId}:${candidateId}`;
  }
  private inflightKey(roomId: string, candidateId: string) {
    return `inflight:${roomId}:${candidateId}`;
  }

  // Attempt to match seeker (user or room)
  private async attemptMatch(seekerId: string, seekerType: 'user' | 'room') {
    try {
      const candidate = await this.matchmakingService.findMatchCandidate(seekerId, seekerType);
      if (!candidate) {
        console.log(`[SocketGateway] no candidate found for ${seekerType}:${seekerId}`);
        return;
      }

      // Check if candidate is actually connected
      const matchSocket = this.io.sockets.sockets.get(candidate.id);
      if (!matchSocket) {
        console.log(`[SocketGateway] candidate ${candidate.id} is stale (disconnected). Cleaning up...`);
        // Remove stale candidate from queue
        await this.matchmakingService.removeFromQueue(candidate.id);
        // Release reservation for seeker so we can retry (candidate reservation expires or we can release)
        await this.matchmakingService.releaseReservations([seekerId, candidate.id]);
        // Retry match immediately
        return this.attemptMatch(seekerId, seekerType);
      }

      // determine context
      let roomId: string;
      let candidateId: string;
      let participants: string[] = [];

      if (seekerType === 'user' && candidate.type === 'user') {
        roomId = crypto.randomUUID();
        console.log(`[SocketGateway] creating provisional room ${roomId} for ${seekerId} <-> ${candidate.id}`);
        await this.roomService.createRoom(roomId);
        await this.roomService.joinRoom(roomId, seekerId);
        // Do NOT add provisional room to queue yet. Only after they match and want expansion.
        participants = [seekerId];
        candidateId = candidate.id;
      } else if (seekerType === 'room' && candidate.type === 'user') {
        roomId = seekerId;
        candidateId = candidate.id;
        participants = await this.roomService.getRoomParticipants(roomId);
      } else if (seekerType === 'user' && candidate.type === 'room') {
        roomId = candidate.id;
        candidateId = seekerId;
        participants = await this.roomService.getRoomParticipants(roomId);
      } else {
        // unexpected
        await this.matchmakingService.releaseReservations([seekerId, candidate.id]);
        return;
      }

      const inflightKey = this.inflightKey(roomId, candidateId);
      const setInflight = await this.redis.set(inflightKey, '1', 'NX', 'EX', Math.ceil(this.recommendationTimeoutMs / 1000));
      if (setInflight !== 'OK') {
        console.log(`[SocketGateway] inflight exists for ${roomId}:${candidateId}, aborting`);
        await this.matchmakingService.releaseReservations([seekerId, candidate.id]);
        return;
      }

      // create pending entry in redis (authoritative)
      const allowed = Array.from(new Set([candidateId, ...participants]));
      await this.redis.set(this.pendingRedisKey(roomId, candidateId), JSON.stringify({ roomId, candidateId, allowed }), 'EX', Math.ceil(this.recommendationTimeoutMs / 1000));
      console.log(`[SocketGateway] pending created for ${roomId}:${candidateId} allowed=${allowed.join(',')}`);

      // local mirror
      this.localPending.set(`${roomId}:${candidateId}`, { roomId, candidateId, allowedVoters: new Set(allowed) });

      const candidatePublic = await this._publicUser(candidateId);
      const seekerPublic = await this._publicUser(seekerId);

      // notify seeker
      this.io.to(seekerId).emit('proposal-received', {
        type: 'outgoing',
        roomId,
        user: candidatePublic, // The other person
        users: [seekerPublic, candidatePublic],
        candidateId // Explicit Key Owner for voting
      });

      // notify candidate
      // In provisional 1v1, matched candidate is 'candidateId'
      if (candidateId) {
        this.io.to(candidateId).emit('proposal-received', {
          type: 'incoming',
          user: seekerPublic, // The other person (Seeker)
          roomId,
          users: [seekerPublic, candidatePublic],
          candidateId // Explicit Key Owner for voting
        });
      }

      // notify other participants in the room (if seeker is a room)
      for (const pid of participants) {
        if (pid !== seekerId) { // Avoid notifying seeker twice if seeker is also a participant
          this.io.to(pid).emit('proposal-received', {
            type: 'incoming',
            user: candidatePublic,
            roomId,
            candidateId
          });
        }
      }

      console.log(`[SocketGateway] proposal sent: room=${roomId} candidate=${candidateId} participants=${participants.join(',')}`);
    } catch (e) {
      console.error('[SocketGateway] attemptMatch error', e);
    }
  }

  // Handle votes (accept / skip)
  private async handleProposalVote(socket: Socket, data: { action: 'accept' | 'skip', recommendedPeerId: string, roomId: string }) {
    const { action, recommendedPeerId, roomId } = data;
    const pendingKey = this.pendingRedisKey(roomId, recommendedPeerId);
    const pendingJson = await this.redis.get(pendingKey);
    if (!pendingJson) {
      console.log(`[SocketGateway] vote received for non-existent pending ${roomId}:${recommendedPeerId} (key=${pendingKey})`);
      socket.emit('recommendation-ended', { reason: 'invalid-recommendation', details: `Key not found: ${pendingKey}` });
      return;
    }

    let pendingObj;
    try { pendingObj = JSON.parse(pendingJson); } catch { pendingObj = null; }
    if (!pendingObj) {
      socket.emit('recommendation-ended', { reason: 'invalid-recommendation' });
      return;
    }

    const allowed: string[] = pendingObj.allowed || [];
    if (!allowed.includes(socket.id)) {
      console.log(`[SocketGateway] unauthorized vote from ${socket.id} for ${roomId}:${recommendedPeerId}`);
      socket.emit('recommendation-ended', { reason: 'not-authorized-vote' });
      return;
    }

    const votesKey = this.votesKey(roomId, recommendedPeerId);
    if (action === 'skip') {
      await this.redis.hset(votesKey, socket.id, 'skip');
      console.log(`[SocketGateway] ${socket.id} voted SKIP on ${roomId}:${recommendedPeerId}`);
      await this.endRecommendationAsSkipped(`${roomId}:${recommendedPeerId}`, socket.id, 'declined');
      return;
    }

    // accept
    await this.redis.hset(votesKey, socket.id, 'accept');
    console.log(`[SocketGateway] ${socket.id} voted ACCEPT on ${roomId}:${recommendedPeerId}`);

    // check candidate accepted
    const candidateVote = await this.redis.hget(votesKey, recommendedPeerId);
    const candidateAccepted = candidateVote === 'accept';

    const participants = await this.roomService.getRoomParticipants(roomId);

    let roomConditionMet = false;
    if (participants.length <= 1) {
      // require all (1v1)
      const votes = await this.redis.hmget(votesKey, ...participants);
      roomConditionMet = participants.length > 0 && votes.every(v => v === 'accept');
    } else {
      // expansion: require at least one member accept
      const votes = await this.redis.hmget(votesKey, ...participants);
      roomConditionMet = votes.some(v => v === 'accept');
    }

    if (candidateAccepted && roomConditionMet) {
      console.log(`[SocketGateway] acceptance condition met for ${roomId}:${recommendedPeerId}`);
      await this.finalizeRecommendationJoin(`${roomId}:${recommendedPeerId}`);
    } else {
      console.log(`[SocketGateway] partial acceptance for ${roomId}:${recommendedPeerId}. Candidate=${candidateAccepted}, Room=${roomConditionMet}`);
      this.io.to(socket.id).emit('recommendation-vote-ack', { roomId });
    }
  }

  // End recommendation as skipped/declined/timeouts
  private async endRecommendationAsSkipped(key: string, by: string | undefined = undefined, reason: string = 'skipped') {
    try {
      const [roomId, candidateId] = key.split(':');
      console.log(`[SocketGateway] endRecommendationAsSkipped ${key} reason=${reason} by=${by}`);

      const participants = await this.roomService.getRoomParticipants(roomId);
      const notify = new Set([...participants, candidateId]);
      for (const sid of notify) {
        this.io.to(sid).emit('recommendation-ended', { reason, by });
      }

      // cleanup redis keys
      await this.redis.del(this.pendingRedisKey(roomId, candidateId));
      await this.redis.del(this.votesKey(roomId, candidateId));
      await this.redis.del(this.inflightKey(roomId, candidateId));

      // release reservations
      await this.matchmakingService.releaseReservations([candidateId, roomId]);

      // requeue candidate
      await this.matchmakingService.addToQueue(candidateId, 'user');

      if (participants.length <= 1) {
        // provisional / 1v1 -> requeue participants individually and destroy room
        for (const p of participants) {
          await this.matchmakingService.addToQueue(p, 'user');
          this.attemptMatch(p, 'user').catch(() => { });
        }
        await this.roomService.destroyRoom(roomId);
        this.attemptMatch(candidateId, 'user').catch(() => { });
      } else {
        // expansion -> room returns to queue
        await this.matchmakingService.addToQueue(roomId, 'room');
        this.attemptMatch(roomId, 'room').catch(() => { });
        this.attemptMatch(candidateId, 'user').catch(() => { });
      }
    } catch (e) {
      console.error('[SocketGateway] endRecommendationAsSkipped error', e);
    }
  }

  // finalize join (all checks passed)
  private async finalizeRecommendationJoin(key: string) {
    try {
      const [roomId, candidateId] = key.split(':');
      console.log(`[SocketGateway] finalizeRecommendationJoin ${key}`);

      const participants = await this.roomService.getRoomParticipants(roomId);
      const size = participants.length;
      if (size + 1 > this.maxParticipants) {
        console.log(`[SocketGateway] room ${roomId} full (size=${size})`);
        await this.endRecommendationAsSkipped(key, undefined, 'room-full');
        return;
      }

      // join candidate
      await this.roomService.joinRoom(roomId, candidateId);
      // notify sockets (if connected)
      const newPeer = await this._publicUser(candidateId);
      this.io.to(roomId).emit('user-joined', newPeer);

      const notify = new Set([...participants, candidateId]);
      for (const sid of notify) {
        this.io.to(sid).emit('recommendation-ended', { reason: 'accepted', roomId });
      }

      // cleanup keys and release reservations
      await this.redis.del(this.pendingRedisKey(roomId, candidateId));
      await this.redis.del(this.votesKey(roomId, candidateId));
      await this.redis.del(this.inflightKey(roomId, candidateId));

      await this.matchmakingService.releaseReservations([candidateId, roomId]);
      console.log(`[SocketGateway] ${candidateId} joined room ${roomId} successfully`);
    } catch (e) {
      console.error('[SocketGateway] finalizeRecommendationJoin error', e);
    }
  }

  // handle leave room with next/disconnect semantics
  private async handleLeaveRoom(socket: Socket, roomId: string, opts: { action: 'next' | 'disconnect' }) {
    try {
      console.log(`[SocketGateway] handleLeaveRoom ${socket.id} room=${roomId} action=${opts.action}`);
      // remove socket from room
      await this.roomService.leaveRoom(socket.id);
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', { socketId: socket.id });

      // cancel pending proposals for this room
      const keys = await this.redis.keys(`pending:${roomId}:*`);
      for (const k of keys) {
        const rest = k.slice(`pending:${roomId}:`.length);
        await this.endRecommendationAsSkipped(`${roomId}:${rest}`, 'room-update', 'skipped');
      }

      const remaining = await this.roomService.getRoomParticipants(roomId);

      if (remaining.length === 0) {
        console.log(`[SocketGateway] room ${roomId} empty after leave`);
        return;
      }

      // Determine 2-person special-case:
      // If remaining.length === 1 and previous was 2, special rules apply
      if (opts.action === 'disconnect' && remaining.length === 1) {
        const survivor = remaining[0];
        // destroy room and requeue survivor
        await this.roomService.leaveRoom(survivor);
        const s = this.io.sockets.sockets.get(survivor);
        s?.leave(roomId);
        this.io.to(survivor).emit('call-ended', { reason: 'Partner disconnected, finding new match...' });
        await this.matchmakingService.addToQueue(survivor, 'user');
        this.attemptMatch(survivor, 'user').catch(() => { });
        console.log(`[SocketGateway] disconnect: survivor ${survivor} requeued`);
      } else if (opts.action === 'next') {
        // nexting user already removed; requeue the nexting user
        await this.matchmakingService.addToQueue(socket.id, 'user');
        this.attemptMatch(socket.id, 'user').catch(() => { });
        // if room had exactly 2 before, we also move the other user to queue
        if (remaining.length === 1) {
          const other = remaining[0];
          await this.roomService.leaveRoom(other);
          const s = this.io.sockets.sockets.get(other);
          s?.leave(roomId);
          await this.matchmakingService.addToQueue(other, 'user');
          this.attemptMatch(other, 'user').catch(() => { });
          console.log(`[SocketGateway] next: both users requeued (previously 2-person)`);
        } else {
          console.log(`[SocketGateway] next: ${socket.id} requeued; room continues with ${remaining.length} members`);
        }
      }
    } catch (e) {
      console.error('[SocketGateway] handleLeaveRoom error', e);
    }
  }

  // handle disconnection
  private async handleDisconnection(socket: Socket) {
    try {
      console.log(`[SocketGateway] handleDisconnection ${socket.id}`);
      const roomId = await this.roomService.getRoomId(socket.id);
      if (roomId) {
        await this.handleLeaveRoom(socket, roomId, { action: 'disconnect' });
      } else {
        await this.matchmakingService.removeFromQueue(socket.id);
      }

      this.userNames.delete(socket.id);
      const userId = this.socketToUserId.get(socket.id);
      if (userId) this.userIdToSocket.delete(userId);
      this.socketToUserId.delete(socket.id);

      // cleanup pending proposals referencing this socket as candidate or voter
      const pendingKeys = await this.redis.keys('pending:*');
      for (const k of pendingKeys) {
        const rest = k.slice('pending:'.length);
        const idx = rest.indexOf(':');
        if (idx < 0) continue;
        const rid = rest.slice(0, idx);
        const cid = rest.slice(idx + 1);
        if (cid === socket.id) {
          await this.endRecommendationAsSkipped(`${rid}:${cid}`, socket.id, 'candidate-disconnected');
        } else {
          const votesKey = this.votesKey(rid, cid);
          const hasVote = await this.redis.hexists(votesKey, socket.id);
          if (hasVote) {
            await this.endRecommendationAsSkipped(`${rid}:${cid}`, socket.id, 'voter-disconnected');
          }
        }
      }
    } catch (e) {
      console.error('[SocketGateway] handleDisconnection error', e);
    }
  }

  // small helper to build public user payload
  private async _publicUser(socketId: string) {
    const userId = this.socketToUserId.get(socketId);
    let dbUser = null;
    if (userId) {
      try {
        dbUser = await UserModel.findById(userId).select('username bio country language avatarUrl preferences interests reputationScore profession');
      } catch (e) { dbUser = null; }
    }
    return {
      peerId: socketId,
      displayName: this.userNames.get(socketId) || `User-${socketId.slice(0, 6)}`,
      username: dbUser?.username || `u${socketId.slice(0, 6)}`,
      avatarUrl: dbUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${socketId}`,
      bio: dbUser?.bio || '',
      country: (dbUser as any)?.country || '',
      language: (dbUser as any)?.preferences?.languages?.[0] || '',
      preferences: (dbUser as any)?.preferences || {},
      interests: (dbUser as any)?.interests || [],
      reputation: (dbUser as any)?.reputationScore || 0,
      profession: (dbUser as any)?.profession?.type || ''
    };
  }
}
