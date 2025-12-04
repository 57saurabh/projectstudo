import { v4 as uuidv4 } from 'uuid';

export class MatchmakingService {
    private queue: string[] = [];
    private rooms: Map<string, { id: string; participants: string[]; max: number }> = new Map();
    private pendingMatches: { roomId: string; peers: string[] }[] = [];

    private readonly MAX_ROOM_SIZE = 10;

    // -----------------------------------------------------------
    // ADD USER TO WAITING QUEUE + AUTO MATCH
    // -----------------------------------------------------------
    async addToQueue(socketId: string) {
        if (!this.queue.includes(socketId)) {
            this.queue.push(socketId);
            console.log(`[Matchmaking] Added ${socketId} → Queue: ${JSON.stringify(this.queue)}`);
        }

        this.autoMatch();  // IMPORTANT: this enables parallel rooms
    }

    // -----------------------------------------------------------
    // PARALLEL ROOM MATCHING (FIXED!)
    //
    // Continues matching until fewer than 2 users remain.
    // Example:
    // Queue = [A, B, C, D, E, F]
    // Rooms will be created:
    //   Room1 = A+B
    //   Room2 = C+D
    //   Room3 = E+F
    //
    // This is TRUE PARALLEL ROOM CREATION.
    // -----------------------------------------------------------
    private autoMatch() {
        while (this.queue.length >= 2) {
            const a = this.queue.shift()!;
            const b = this.queue.shift()!;

            const roomId = uuidv4();

            const room = {
                id: roomId,
                participants: [a, b],
                max: this.MAX_ROOM_SIZE
            };

            this.rooms.set(roomId, room);

            console.log(`[Matchmaking] MATCH → ${a} & ${b} → Room ${roomId}`);

            // Store for server to emit matched event
            this.pendingMatches.push({
                roomId,
                peers: [...room.participants]
            });
        }
    }

    // -----------------------------------------------------------
    // SERVER FETCHES NEWLY CREATED ROOMS
    // -----------------------------------------------------------
    getPendingMatches() {
        const res = [...this.pendingMatches];
        this.pendingMatches = [];
        return res;
    }

    // -----------------------------------------------------------
    // +1 LOGIC: ADD NEW USER TO EXISTING ROOM (up to 10)
    // -----------------------------------------------------------
    async findUserForRoom(roomId: string, currentParticipants: string[]): Promise<string | null> {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        if (room.participants.length >= room.max) {
            console.log(`[Matchmaking] Room ${roomId} is FULL`);
            return null;
        }

        // Find next user available in queue
        const newPeer = this.queue.find(id => !room.participants.includes(id));

        if (!newPeer) return null;

        this.removeFromQueue(newPeer);
        room.participants.push(newPeer);

        console.log(`[Matchmaking] +1 ADDED → ${newPeer} → Room ${roomId}`);

        return newPeer;
    }

    // -----------------------------------------------------------
    // REMOVE USER FROM QUEUE ONLY
    // -----------------------------------------------------------
    removeFromQueue(socketId: string) {
        const before = this.queue.length;
        this.queue = this.queue.filter(id => id !== socketId);

        if (this.queue.length !== before) {
            console.log(`[Matchmaking] Removed ${socketId} from queue`);
        }
    }

    // -----------------------------------------------------------
    // REMOVE USER FROM ROOM + AUTO DELETE ROOM IF EMPTY
    // -----------------------------------------------------------
    removeUser(socketId: string): { roomId: string, remaining: string[] } | null {
        this.removeFromQueue(socketId);

        for (const [roomId, room] of this.rooms) {
            if (room.participants.includes(socketId)) {
                room.participants = room.participants.filter(id => id !== socketId);

                console.log(`[Matchmaking] User ${socketId} REMOVED from Room ${roomId}`);

                // Return details BEFORE deleting if empty, so caller knows what happened
                const result = {
                    roomId,
                    remaining: [...room.participants]
                };

                if (room.participants.length === 0) {
                    this.rooms.delete(roomId);
                    console.log(`[Matchmaking] Room ${roomId} DELETED (empty)`);
                }

                return result;
            }
        }
        return null;
    }

    // -----------------------------------------------------------
    // DEBUG HELPERS
    // -----------------------------------------------------------
    getRooms() {
        return Array.from(this.rooms.values());
    }

    getQueue() {
        return [...this.queue];
    }
}
