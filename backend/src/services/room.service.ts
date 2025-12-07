// room.service.ts
import Redis from 'ioredis';

/**
 * RoomService (Redis-backed, OPTION 1)
 *
 * - room:{roomId} => SET of socketIds
 * - socket:{socketId}:room => string roomId (for O(1) lookup)
 *
 * All operations are Redis-backed and logged.
 */

export class RoomService {
  private redis: Redis.Redis;
  private readonly ROOM_PREFIX = 'room:';            // room:{roomId}
  private readonly SOCKET_ROOM_PREFIX = 'socket:';   // socket:{socketId}:room

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.redis = new Redis(url);
    this.redis.on('error', (e) => console.error('[RoomService][Redis] error', e));
    console.log('[RoomService] connected to Redis at', url);
  }

  private roomKey(roomId: string) {
    return `${this.ROOM_PREFIX}${roomId}`;
  }

  private socketRoomKey(socketId: string) {
    return `${this.SOCKET_ROOM_PREFIX}${socketId}:room`;
  }

  // Create empty room (idempotent)
  async createRoom(roomId: string) {
    const key = this.roomKey(roomId);
    await this.redis.sadd(key, '__room__');
    await this.redis.srem(key, '__room__');
    console.log(`[RoomService] room created ${roomId}`);
  }

  // Join socket to room: add to set and set socket->room mapping
  async joinRoom(roomId: string, socketId: string) {
    const rKey = this.roomKey(roomId);
    await this.redis.sadd(rKey, socketId);
    await this.redis.set(this.socketRoomKey(socketId), roomId);
    console.log(`[RoomService] socket ${socketId} joined room ${roomId}`);
  }

  // Leave room by socketId (uses socket->room mapping for O(1))
  async leaveRoom(socketId: string): Promise<string | null> {
    const mappingKey = this.socketRoomKey(socketId);
    const roomId = await this.redis.get(mappingKey);
    if (!roomId) {
      console.log(`[RoomService] leaveRoom: socket ${socketId} not in any room`);
      return null;
    }
    const rKey = this.roomKey(roomId);
    await this.redis.srem(rKey, socketId);
    await this.redis.del(mappingKey);
    const size = await this.redis.scard(rKey);
    if (size === 0) {
      await this.redis.del(rKey);
      console.log(`[RoomService] room ${roomId} deleted (empty)`);
    } else {
      console.log(`[RoomService] socket ${socketId} left room ${roomId}. size=${size}`);
    }
    return roomId;
  }

  // O(1) get roomId for socket
  async getRoomId(socketId: string): Promise<string | undefined> {
    const v = await this.redis.get(this.socketRoomKey(socketId));
    return v || undefined;
  }

  // Get all participants
  async getRoomParticipants(roomId: string): Promise<string[]> {
    const list = await this.redis.smembers(this.roomKey(roomId));
    return list || [];
  }

  async getRoomSize(roomId: string): Promise<number> {
    const n = await this.redis.scard(this.roomKey(roomId));
    return n || 0;
  }

  async destroyRoom(roomId: string) {
    await this.redis.del(this.roomKey(roomId));
    // remove socket->room mappings is tricky: we can iterate members and delete mapping.
    // For scale, maintain additional index if needed.
    console.log(`[RoomService] destroy room ${roomId}`);
  }
}
