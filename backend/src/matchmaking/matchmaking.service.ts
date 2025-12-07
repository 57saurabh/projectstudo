// matchmaking.service.ts
import { v4 as uuidv4 } from 'uuid';

/**
 * MatchmakingService
 *
 * Responsibilities:
 *  - Maintain queue of idle users
 *  - Auto-match idle users in pairs (A+B, C+D...)
 *  - Manage room participant lists
 *  - Provide idle users for recommendation
 *
 * This service NEVER auto-adds users to rooms during recommendation.
 */

export class MatchmakingService {
    // waiting users (idle)
    private queue: string[] = [];

    // active rooms
    private rooms: Map<string, { id: string; participants: string[] }> = new Map();

    // auto-match results to be picked by gateway
    private pendingMatches: { roomId: string; peers: string[] }[] = [];

    // max users per room
    private readonly MAX_ROOM_SIZE = 9;

    // -----------------------------------------------------------
    // ADD USER TO QUEUE & AUTO-MATCH PAIRS
    // -----------------------------------------------------------
    async addToQueue(socketId: string) {
        if (!this.queue.includes(socketId)) {
            this.queue.push(socketId);
            console.log(`[Matchmaking] + Added to queue: ${socketId}`);
        }
        this.autoMatch();
    }

    // -----------------------------------------------------------
    // AUTO-MATCH IN PARALLEL
    // -----------------------------------------------------------
    private autoMatch() {
        while (this.queue.length >= 2) {
            const a = this.queue.shift()!;
            const b = this.queue.shift()!;
            const roomId = uuidv4();

            this.rooms.set(roomId, {
                id: roomId,
                participants: [a, b],
            });

            console.log(`[Matchmaking] MATCH → ${a} ↔ ${b} in room ${roomId}`);

            this.pendingMatches.push({
                roomId,
                peers: [a, b]
            });
        }
    }

    // -----------------------------------------------------------
    // GET NEW MATCHES FOR SOCKET GATEWAY
    // -----------------------------------------------------------
    getPendingMatches() {
        const out = [...this.pendingMatches];
        this.pendingMatches = [];
        return out;
    }

    // -----------------------------------------------------------
    // FIND NEXT USER FOR RECOMMENDATION
    // DOES NOT JOIN ROOM — ONLY RETURNS CANDIDATE
    // -----------------------------------------------------------
    async findPeerForRecommendation(
        roomId: string,
        currentParticipants: string[]
    ): Promise<string | null> {

        const room = this.rooms.get(roomId);
        if (!room) {
            console.log(`[Matchmaking] Recommendation failed → room not found`);
            return null;
        }

        if (room.participants.length >= this.MAX_ROOM_SIZE) {
            console.log(`[Matchmaking] Room ${roomId} full (${room.participants.length}/9)`);
            return null;
        }

        // candidate = first idle user not in this room
        const candidate = this.queue.find(id => !currentParticipants.includes(id));

        if (!candidate) {
            console.log(`[Matchmaking] No candidate found for room ${roomId}`);
            return null;
        }

        // REMOVE FROM QUEUE (to prevent being matched elsewhere)
        this.removeFromQueue(candidate);

        console.log(`[Matchmaking] Recommendation → ${candidate} for room ${roomId}`);

        return candidate;
    }

    // -----------------------------------------------------------
    // REMOVE USER FROM QUEUE ONLY
    // -----------------------------------------------------------
    removeFromQueue(socketId: string) {
        const before = this.queue.length;
        this.queue = this.queue.filter(id => id !== socketId);
        if (this.queue.length !== before) {
            console.log(`[Matchmaking] - Removed from queue: ${socketId}`);
        }
    }

    // -----------------------------------------------------------
    // REMOVE USER FROM ROOM
    // -----------------------------------------------------------
    removeUser(socketId: string): { roomId: string; remaining: string[] } | null {
        // Always remove from queue
        this.removeFromQueue(socketId);

        for (const [roomId, room] of this.rooms.entries()) {
            if (room.participants.includes(socketId)) {
                room.participants = room.participants.filter(id => id !== socketId);

                console.log(`[Matchmaking] User ${socketId} removed from room ${roomId}`);

                const result = {
                    roomId,
                    remaining: [...room.participants],
                };

                if (room.participants.length === 0) {
                    this.rooms.delete(roomId);
                    console.log(`[Matchmaking] Room ${roomId} deleted (empty)`);
                }

                return result;
            }
        }

        return null;
    }

    // -----------------------------------------------------------
    // DEBUGGING HELPERS
    // -----------------------------------------------------------
    getRooms() {
        return [...this.rooms.values()];
    }

    getQueue() {
        return [...this.queue];
    }

    // -----------------------------------------------------------
    // GET SUGGESTIONS FOR IDLE USERS (Chatroulette-style)
    // -----------------------------------------------------------
    getSuggestions(excludeId: string): string[] {
        return this.queue
            .filter(id => id !== excludeId)
            .slice(0, 5);
    }
}
