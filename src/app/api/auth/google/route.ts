import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import dbConnect from '@/lib/db';
import { UserModel as User } from '@/models/User.schema';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getIpFromRequest, getLocationFromIp } from '@/lib/ipUtils';
import { uniqueNamesGenerator, Config, colors, animals, NumberDictionary } from 'unique-names-generator';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { credential } = await req.json();

        if (!credential) {
            return NextResponse.json({ message: 'Missing credential' }, { status: 400 });
        }

        // Verify Google Token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 400 });
        }

        const { email, name, picture } = payload;

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create new user

            // Generate Random Username
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
                    // Fallback to random string
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

            if (!isUnique) {
                const fallbackBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                uniqueUsername = `${fallbackBase}${Date.now()}`;
            }

            // Get IP/Location
            const ip = getIpFromRequest(req);
            let locationData = null;
            if (ip) {
                locationData = await getLocationFromIp(ip);
            }

            user = await User.create({
                email,
                displayName: name,
                username: uniqueUsername,
                avatarUrl: picture,
                privateId: uuidv4(),
                status: 'online',
                currentIP: ip,
                currentLocation: locationData,
                signupLocation: locationData,
                // We might want to mark this user as google-authenticated if we had a provider field
                // but for now email is enough. Password can be empty or handled.
                // Schema usually requires password? Let's check schema.
                // If schema requires password, we need to set a dummy one or make it optional.
                // Assuming schema allows missing password or we set a random one.
                password: await import('bcryptjs').then(bcrypt => bcrypt.hash(uuidv4(), 10))
            });
        } else {
            // Update IP/Location for existing user
            const ip = getIpFromRequest(req);
            if (ip) {
                const locationData = await getLocationFromIp(ip);
                if (locationData) {
                    user.currentIP = ip;
                    user.currentLocation = locationData;
                    await user.save();
                }
            }
        }

        // Generate JWT
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.currentIP;

        return NextResponse.json({ token, user: userObj }, { status: 200 });

    } catch (error) {
        console.error('Google Auth Error:', error);
        return NextResponse.json({ message: 'Authentication failed' }, { status: 500 });
    }
}
