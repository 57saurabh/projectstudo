import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { UserModel as User } from '@/models/User.schema';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getIpFromRequest, getLocationFromIp } from '@/lib/ipUtils';
import { uniqueNamesGenerator, Config, colors, animals, NumberDictionary } from 'unique-names-generator';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { email, password, displayName, username } = await req.json();

        // 1. Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
        }

        // 2. Handle Display Name
        let finalDisplayName = displayName;
        if (!finalDisplayName) {
            finalDisplayName = email.split('@')[0];
        }

        // 3. Handle Username
        let finalUsername = username;
        if (finalUsername) {
            // If provided, check uniqueness
            const existingUsername = await User.findOne({ username: finalUsername });
            if (existingUsername) {
                return NextResponse.json({ message: 'Username is already taken' }, { status: 400 });
            }
        } else {
            // Auto-generate Random Username (not based on email)
            let isUnique = false;
            let attempts = 0;
            let uniqueUsername = '';

            const config: Config = {
                dictionaries: [colors, animals],
                separator: '',
                length: 2,
                style: 'lowerCase'
            };

            while (!isUnique && attempts < 20) {
                let candidate = '';
                // Try to generate a short name
                if (attempts < 10) {
                    const randomName = uniqueNamesGenerator(config);
                    candidate = randomName.replace(/[^a-z0-9]/g, '');
                    // If too long, try adding a number to a single word
                    if (candidate.length > 8) {
                        const shortConfig: Config = {
                            dictionaries: [animals, NumberDictionary.generate({ min: 1, max: 99 })],
                            separator: '',
                            length: 2,
                            style: 'lowerCase'
                        };
                        candidate = uniqueNamesGenerator(shortConfig).replace(/[^a-z0-9]/g, '');
                    }
                } else {
                    // Fallback to random string if we're having trouble
                    candidate = Math.random().toString(36).substring(2, 10);
                }

                // Hard limit check
                if (candidate.length > 8) {
                    candidate = candidate.substring(0, 8);
                }

                const existing = await User.findOne({ username: candidate });
                if (!existing) {
                    uniqueUsername = candidate;
                    isUnique = true;
                } else {
                    attempts++;
                }
            }

            // Fallback if still not unique (highly unlikely with 3 words + number)
            if (!isUnique) {
                const fallbackBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                uniqueUsername = `${fallbackBase}${Date.now()}`;
            }

            finalUsername = uniqueUsername;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Get IP and Location
        const ip = getIpFromRequest(req);
        let locationData = null;
        if (ip) {
            locationData = await getLocationFromIp(ip);
        }

        // Create user
        const newUser = await User.create({
            email,
            password: hashedPassword,
            displayName: finalDisplayName,
            username: finalUsername,
            privateId: uuidv4(),
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalUsername || email}`,
            status: 'online',
            currentIP: ip,
            currentLocation: locationData,
            signupLocation: locationData
        });

        // Generate Token
        const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

        // Return user without password and sensitive fields
        const userObj = newUser.toObject();
        delete userObj.password;
        delete userObj.currentIP; // Ensure IP is not sent to client

        return NextResponse.json({ token, user: userObj }, { status: 201 });

    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
