export class MatchmakingService {
    // In a real app, use Redis for this
    private queue: string[] = [];

    async addToQueue(socketId: string) {
        if (!this.queue.includes(socketId)) {
            this.queue.push(socketId);
            console.log(`Added ${socketId} to queue. Queue size: ${this.queue.length}`);
        }
    }

    async findMatch(socketId: string): Promise<string | null> {
        // Simple FIFO matching
        const index = this.queue.indexOf(socketId);
        if (index === -1) return null;

        // Look for anyone else in the queue
        const peer = this.queue.find(id => id !== socketId);

        if (peer) {
            // Remove both from queue
            this.removeFromQueue(socketId);
            this.removeFromQueue(peer);
            console.log(`Match found: ${socketId} <-> ${peer}`);
            return peer;
        }

        return null;
    }

    removeFromQueue(socketId: string) {
        this.queue = this.queue.filter(id => id !== socketId);
    }
}
