import { LiveSession } from '../models/LiveSession';
import { LiveDestination } from '../models/LiveDestination';
import { UserModel } from '../models/User';

export class LiveService {
    async startSession(userId: string, data: any) {
        const { title, description, destinations } = data;

        // Create Live Destinations
        const destinationIds = [];
        if (destinations && destinations.length > 0) {
            for (const dest of destinations) {
                const newDest = await LiveDestination.create({
                    platform: dest.platform,
                    rtmpUrl: dest.rtmpUrl, // In real app, fetch from connected account or user input
                    streamKey: dest.streamKey,
                    status: 'active'
                });
                destinationIds.push(newDest._id);
            }
        }

        // Create Live Session
        const session = await LiveSession.create({
            host: userId,
            title,
            description,
            type: 'broadcast', // Default for now
            status: 'live',
            destinations: destinationIds,
            startedAt: new Date()
        });

        // Update User status
        await UserModel.findByIdAndUpdate(userId, { isLive: true });

        return session;
    }

    async stopSession(userId: string, sessionId: string) {
        const session = await LiveSession.findOne({ _id: sessionId, host: userId });
        if (!session) {
            throw new Error('Session not found or unauthorized');
        }

        session.status = 'ended';
        session.endedAt = new Date();
        await session.save();

        // Update destinations
        await LiveDestination.updateMany(
            { _id: { $in: session.destinations } },
            { status: 'ended' }
        );

        // Update User status
        await UserModel.findByIdAndUpdate(userId, { isLive: false });

        return session;
    }

    async getSessionStatus(sessionId: string) {
        const session = await LiveSession.findById(sessionId).populate('destinations');
        if (!session) {
            throw new Error('Session not found');
        }
        return session;
    }

    async getComments(sessionId: string) {
        // Mock comments for now
        return [
            { id: '1', user: 'User1', text: 'Hello!', platform: 'youtube', timestamp: new Date() },
            { id: '2', user: 'User2', text: 'Cool stream!', platform: 'instagram', timestamp: new Date() }
        ];
    }
}
