import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(req: Request) {
    try {
        await dbConnect();

        const userId = req.headers.get('x-user-id');

        if (!userId) {
            return NextResponse.json(
                { message: 'Unauthorized: Missing User ID' },
                { status: 401 }
            );
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(user, { status: 200 });

    } catch (error: any) {
        console.error('Get User error:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to fetch user' },
            { status: 500 }
        );
    }
}
