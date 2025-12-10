// matchmaking.service.ts
import { OnlineUser } from '../models/OnlineUser';

export class MatchmakingService {

  constructor() { }

  async setOnline(socketId: string) {
    // Upsert user state to ONLINE
    await OnlineUser.findOneAndUpdate(
      { socketId },
      { state: 'ONLINE', lastHeartbeat: new Date() },
      { upsert: true, new: true }
    );
  }

  async setBusy(socketId: string) {
    await OnlineUser.findOneAndUpdate(
      { socketId },
      { state: 'BUSY' }
    );
  }

  // Atomic Reservation: Returns true if user was ONLINE and is now BUSY
  async reserveUser(socketId: string): Promise<boolean> {
    const res = await OnlineUser.findOneAndUpdate(
      { socketId, state: 'ONLINE' },
      { state: 'BUSY' }
    );
    return !!res; // If res is null, user was not online or already busy
  }

  async setOffline(socketId: string) {
    await OnlineUser.deleteOne({ socketId });
  }

  async getUserState(socketId: string): Promise<'ONLINE' | 'BUSY' | null> {
    const user = await OnlineUser.findOne({ socketId }).select('state');
    return (user?.state as 'ONLINE' | 'BUSY') || null;
  }

  async getRecommendations(seekerId: string, limit: number = 5): Promise<string[]> {
    // Aggregation for random sampling
    const pipeline = [
      { $match: { state: 'ONLINE', socketId: { $ne: seekerId } } },
      { $sample: { size: limit } },
      { $project: { socketId: 1, _id: 0 } }
    ];

    const results = await OnlineUser.aggregate(pipeline);
    return results.map(r => r.socketId);
  }
}
