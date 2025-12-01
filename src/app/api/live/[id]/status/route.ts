import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { LiveSessionModel as LiveSession } from '@backend/src/models/LiveSession';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        await dbConnect();
        const session = await LiveSession.findById(params.id).populate('host', 'displayName username avatarUrl');

        if (!session) {
            return NextResponse.json({ message: 'Session not found' }, { status: 404 });
        }

        return NextResponse.json(session, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
