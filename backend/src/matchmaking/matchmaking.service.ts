// matchmaking.service.ts
import Redis from 'ioredis';

export interface QueueItem {
  id: string;
  type: 'user' | 'room';
  score?: number;
}

/**
 * Redis-backed MatchmakingService (OPTION 1)
 *
 * - Queue: Redis LIST 'match:queue' (JSON entries)
 * - Reservation lock: 'lock:{id}' (SETNX + EX)
 * - Rooms: managed via RoomService (Redis)
 *
 * The service exposes reservation primitives and queue helpers.
 */

export class MatchmakingService {
  private redis: Redis.Redis;
  private readonly QUEUE_KEY = 'match:queue';
  private readonly LOCK_PREFIX = 'lock:'; // lock:{id}
  private readonly LOCK_TTL_SEC = 35; // TTL for lock (seconds)
  private readonly MAX_ROOM_SIZE = 10;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.redis = new Redis(url);
    this.redis.on('error', (err) => console.error('[Matchmaking][Redis] error', err));
    console.log('[Matchmaking] connected to Redis at', url);
  }

  // Add JSON entry to queue (push right, consume left)
  async addToQueue(id: string, type: 'user' | 'room') {
    const entry = JSON.stringify({ id, type });
    await this.redis.rpush(this.QUEUE_KEY, entry);
    console.log(`[Matchmaking] + queued ${type} ${id}`);
    await this.redis.publish('match:events', JSON.stringify({ event: 'queue:add', id, type }));
  }

  // Remove all occurrences of id from queue (best-effort)
  async removeFromQueue(id: string) {
    // attempt direct JSON removals for both types and fallback scanning
    await this.redis.lrem(this.QUEUE_KEY, 0, JSON.stringify({ id, type: 'user' }));
    await this.redis.lrem(this.QUEUE_KEY, 0, JSON.stringify({ id, type: 'room' }));

    const snapshot = await this.redis.lrange(this.QUEUE_KEY, 0, -1);
    for (const raw of snapshot) {
      try {
        const obj = JSON.parse(raw);
        if (obj && obj.id === id) {
          await this.redis.lrem(this.QUEUE_KEY, 0, raw);
        }
      } catch { /* ignore */ }
    }
    console.log(`[Matchmaking] - removed ${id} from queue (if existed)`);
  }

  // Reserve id via SETNX with TTL. Returns true if reserved.
  async reserve(id: string): Promise<boolean> {
    const key = this.LOCK_PREFIX + id;
    try {
      const res = await this.redis.set(key, '1', 'NX', 'EX', this.LOCK_TTL_SEC);
      const ok = res === 'OK';
      console.log(`[Matchmaking] reserve ${id} -> ${ok ? 'OK' : 'BUSY'}`);
      return ok;
    } catch (e) {
      console.error('[Matchmaking] reserve error', e);
      return false;
    }
  }

  async release(id: string) {
    const key = this.LOCK_PREFIX + id;
    await this.redis.del(key);
    console.log(`[Matchmaking] release ${id}`);
  }

  async isReserved(id: string): Promise<boolean> {
    const key = this.LOCK_PREFIX + id;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  // Find one candidate for seekerId. This scans queue snapshot, tries to reserve candidate + seeker.
  async findMatchCandidate(seekerId: string, seekerType: 'user' | 'room'): Promise<QueueItem | null> {
    const snapshot = await this.redis.lrange(this.QUEUE_KEY, 0, -1);
    console.log(`[Matchmaking] scanning queue for seeker ${seekerType}:${seekerId} (len=${snapshot.length})`);

    for (const raw of snapshot) {
      let item: QueueItem | null = null;
      try { item = JSON.parse(raw); } catch { continue; }
      if (!item) continue;
      if (item.id === seekerId) continue;
      if (seekerType === 'room' && item.type !== 'user') continue;

      // attempt reserve candidate then seeker
      const candidateReserved = await this.reserve(item.id);
      if (!candidateReserved) continue;

      const seekerReserved = await this.reserve(seekerId);
      if (!seekerReserved) {
        await this.release(item.id);
        continue;
      }

      // remove this candidate occurrence (best-effort) and remove seeker occurrences
      await this.redis.lrem(this.QUEUE_KEY, 1, raw);
      await this.removeFromQueue(seekerId);

      console.log(`[Matchmaking] reserved pair seeker=${seekerId} candidate=${item.id}`);
      return item;
    }

    return null;
  }

  async releaseReservations(ids: string[]) {
    for (const id of ids) {
      await this.release(id);
    }
  }

  // For debugging: get snapshot of queue
  async getQueue(): Promise<QueueItem[]> {
    const raw = await this.redis.lrange(this.QUEUE_KEY, 0, -1);
    const out: QueueItem[] = [];
    for (const r of raw) {
      try { out.push(JSON.parse(r)); } catch { /* ignore */ }
    }
    return out;
  }
}
