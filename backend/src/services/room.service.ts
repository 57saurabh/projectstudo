
export class RoomService {
    // Map<roomId, Set<socketId>>
    private rooms: Map<string, Set<string>> = new Map();
    // Map<socketId, roomId>
    private socketToRoom: Map<string, string> = new Map();

    createRoom(roomId: string) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
    }

    joinRoom(roomId: string, socketId: string) {
        if (!this.rooms.has(roomId)) {
            this.createRoom(roomId);
        }
        this.rooms.get(roomId)!.add(socketId);
        this.socketToRoom.set(socketId, roomId);
        console.log(`Socket ${socketId} joined room ${roomId}. Size: ${this.rooms.get(roomId)!.size}`);
    }

    leaveRoom(socketId: string): string | null {
        const roomId = this.socketToRoom.get(socketId);
        if (roomId) {
            const room = this.rooms.get(roomId);
            if (room) {
                room.delete(socketId);
                if (room.size === 0) {
                    this.rooms.delete(roomId);
                    console.log(`Room ${roomId} deleted (empty).`);
                } else {
                    console.log(`Socket ${socketId} left room ${roomId}. Size: ${room.size}`);
                }
            }
            this.socketToRoom.delete(socketId);
            return roomId;
        }
        return null;
    }

    getRoomId(socketId: string): string | undefined {
        return this.socketToRoom.get(socketId);
    }

    getRoomParticipants(roomId: string): string[] {
        return Array.from(this.rooms.get(roomId) || []);
    }

    getRoomSize(roomId: string): number {
        return this.rooms.get(roomId)?.size || 0;
    }
}
