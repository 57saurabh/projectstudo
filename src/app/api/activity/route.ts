import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Activity from '@/models/Activity';
import { UserModel as User } from '@/models/User.schema';

export async function GET() {
    await connectDB();
    try {
        const activities = await Activity.find()
            .populate('userId', 'displayName username avatarUrl')
            .sort({ createdAt: -1 })
            .limit(10);
        return NextResponse.json(activities);
    } catch (error) {
        return NextResponse.json({ message: 'Failed to fetch activity' }, { status: 500 });
    }
}
