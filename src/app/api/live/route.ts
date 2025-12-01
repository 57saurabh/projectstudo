import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { LiveSessionModel as LiveSession } from '@backend/src/models/LiveSession';
import { UserModel as User } from '@/models/User';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

const getUserId = (req: Request) => {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded: any = jwt.verify(token, JWT_SECRET);
            return decoded.id;
        } catch (err) {
            return null;
        }
    }
    return req.headers.get('x-user-id');
};

// POST: Start Live Session
export async function POST(req: Request) {
    try {
        await dbConnect();
        const userId = getUserId(req);
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { type, platforms, title, description, activeCallId } = await req.json();

        // Check if user already has an active session
        const existingSession = await LiveSession.findOne({
            host: userId,
            status: { $in: ['configuring', 'connecting', 'live'] }
        });

        if (existingSession) {
            return NextResponse.json({ message: 'You already have an active live session' }, { status: 400 });
        }

        const destinations = [];

        // Mocking destination creation logic
        if (platforms.includes('internal')) {
            destinations.push({
                platform: 'internal',
                url: `rtmp://live.zylo.com/app`,
                key: `${userId}-${uuidv4()}`,
                status: 'connecting'
            });
        }

        if (platforms.includes('youtube')) {
            // In real app, fetch connected account and create stream via YouTube API
            destinations.push({
                platform: 'youtube',
                url: 'rtmp://a.rtmp.youtube.com/live2',
                key: 'mock-youtube-key',
                status: 'connecting'
            });
        }

        if (platforms.includes('instagram')) {
            // In real app, fetch connected account and create stream via Instagram API
            destinations.push({
                platform: 'instagram',
                url: 'rtmps://live-upload.instagram.com:443/rtmp/',
                key: 'mock-instagram-key',
                status: 'connecting'
            });
        }

        const newSession = await LiveSession.create({
            host: userId,
            type,
            status: 'connecting',
            platforms,
            activeCallId,
            title,
            description,
            destinations,
            startedAt: new Date()
        });

        // Simulate connection success after 2 seconds (in a real app this would be async or webhook driven)
        // For this demo, we return immediately but frontend can poll status

        return NextResponse.json(newSession, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// PUT: Stop Live Session
export async function PUT(req: Request) {
    try {
        await dbConnect();
        const userId = getUserId(req);
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { sessionId } = await req.json();

        const session = await LiveSession.findOne({ _id: sessionId, host: userId });
        if (!session) return NextResponse.json({ message: 'Session not found' }, { status: 404 });

        session.status = 'ended';
        session.endedAt = new Date();
        session.destinations.forEach((d: any) => d.status = 'failed'); // Or 'ended' if we had that status
        await session.save();

        return NextResponse.json({ message: 'Live session ended' }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
