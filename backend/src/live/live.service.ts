import { LiveSessionModel as LiveSession } from '../models/LiveSession';
import { UserModel } from '../models/User';

export class LiveService {
    async startSession(userId: string, data: any) {
        const { title, description, destinations } = data;

        // Prepare destinations data for embedding
        const destinationsData = destinations?.map((dest: any) => ({
            platform: dest.platform,
            rtmpUrl: dest.rtmpUrl,
            streamKey: dest.streamKey,
            status: 'active'
        })) || [];

        // Create Live Session with embedded destinations
        const session = await LiveSession.create({
            host: userId,
            title,
            description,
            type: 'broadcast', // Default for now
            status: 'live',
            destinations: destinationsData,
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

        // Update embedded destinations status
        if (session.destinations && session.destinations.length > 0) {
            session.destinations.forEach((dest: any) => {
                dest.status = 'ended';
            });
        }

        await session.save();

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
