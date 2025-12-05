import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { UserModel as User } from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const authHeader = req.headers.get('authorization');

        let userId: string | null = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded: any = jwt.verify(token, JWT_SECRET);
                userId = decoded.id;
            } catch (err) {
                return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
            }
        } else {
            // Fallback to x-user-id header if provided (internal use or dev)
            userId = req.headers.get('x-user-id');
        }

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);

    } catch (error: any) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        await dbConnect();
        const authHeader = req.headers.get('authorization');

        let userId: string | null = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded: any = jwt.verify(token, JWT_SECRET);
                userId = decoded.id;
            } catch (err) {
                return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
            }
        } else {
            userId = req.headers.get('x-user-id');
        }

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        const allowedFields = [
            "theme",
            "displayName",
            "username",
            "bio",
            "profession",
            "website",
            "gender",
            "age",
            "country",
            "region",
            "university",
            "interests",
            "languages",
            "languageCountries",
            "avatarUrl"
        ];

        const updateData: any = {};
        for (const field of allowedFields) {
            if (body.hasOwnProperty(field)) {
                updateData[field] = body[field];
            }
        }

        console.log("Final updateData:", updateData);

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        ).select("-password");

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);

    } catch (error) {
        console.error("PUT /user/me error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
