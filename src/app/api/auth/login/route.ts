import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { UserModel as User } from '@/models/User.schema';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getIpFromRequest, getLocationFromIp } from '@/lib/ipUtils';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { email, password } = await req.json();

        // Check if user exists
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 400 });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 400 });
        }

        // Update Location
        const ip = getIpFromRequest(req);
        if (ip) {
            const locationData = await getLocationFromIp(ip);
            if (locationData) {
                user.currentIP = ip;
                user.currentLocation = locationData;
                await user.save();
            }
        }

        // Generate Token
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

        // Return user without password
        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.currentIP; // Ensure IP is not sent to client

        return NextResponse.json({ token, user: userObj }, { status: 200 });

    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
