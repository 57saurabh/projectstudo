import { ActiveRoom } from '../models/ActiveRoom';

export class RoomService {

  constructor() { }

  async createRoom(roomId: string, participants: string[]) {
    // Atomic creation
    await ActiveRoom.create({ roomId, participants });
  }

  async getRoomId(socketId: string): Promise<string | null> {
    const room = await ActiveRoom.findOne({ participants: socketId }).select('roomId');
    return room?.roomId || null;
  }

  async getRoomParticipants(roomId: string): Promise<string[]> {
    const room = await ActiveRoom.findOne({ roomId });
    return room?.participants || [];
  }

  async addUserToRoom(roomId: string, socketId: string) {
    await ActiveRoom.updateOne({ roomId }, { $addToSet: { participants: socketId } });
  }

  async removeUserFromRoom(roomId: string, socketId: string) {
    await ActiveRoom.updateOne({ roomId }, { $pull: { participants: socketId } });

    // Cleanup empty rooms
    const room = await ActiveRoom.findOne({ roomId });
    if (room && room.participants.length === 0) {
      await ActiveRoom.deleteOne({ roomId });
    }
  }

  async deleteRoom(roomId: string) {
    await ActiveRoom.deleteOne({ roomId });
  }
}
