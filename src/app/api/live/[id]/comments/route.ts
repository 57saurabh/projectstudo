import { NextResponse } from 'next/server';

// Mock comments for now
const MOCK_COMMENTS = [
    { id: '1', source: 'internal', username: 'Sarah', message: 'This is awesome!', timestamp: new Date().toISOString() },
    { id: '2', source: 'youtube', username: 'Gamer123', message: 'Hello from YouTube!', timestamp: new Date().toISOString() },
    { id: '3', source: 'instagram', username: 'insta_fan', message: 'Love the stream ❤️', timestamp: new Date().toISOString() },
];

export async function GET(req: Request, { params }: { params: { id: string } }) {
    // In a real app, this would fetch from DB + External APIs
    return NextResponse.json(MOCK_COMMENTS, { status: 200 });
}
