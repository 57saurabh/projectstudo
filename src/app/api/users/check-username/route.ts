import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { UserModel as User } from '@/models/User.schema';
import { uniqueNamesGenerator, Config, adjectives, colors, animals, NumberDictionary } from 'unique-names-generator';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const username = searchParams.get('username');
        const displayName = searchParams.get('displayName');

        // 1. Check Availability
        if (username) {
            const existingUser = await User.findOne({ username: username.toLowerCase() });

            if (!existingUser) {
                return NextResponse.json({
                    available: true,
                    username: username
                });
            }

            // If taken, generate suggestions based on the requested username
            const base = username.toLowerCase().replace(/[^a-z0-9]/g, '');
            const suggestions: string[] = [];

            // Helper to check and add
            const addIfUnique = async (s: string) => {
                if (suggestions.includes(s)) return;
                const exists = await User.findOne({ username: s });
                if (!exists) suggestions.push(s);
            };

            // Strategy 1: Simple variations
            await addIfUnique(`${base}${Math.floor(Math.random() * 100)}`);
            await addIfUnique(`${base}_${new Date().getFullYear()}`);

            // Strategy 2: Cool generated names
            const config: Config = {
                dictionaries: [adjectives, colors, animals],
                separator: '_',
                length: 2,
                style: 'lowerCase'
            };

            for (let i = 0; i < 3; i++) {
                if (suggestions.length >= 5) break;
                let customConfig = { ...config };
                // Mix in the base name
                customConfig = {
                    dictionaries: [[base], adjectives, animals],
                    separator: '_',
                    length: 3,
                    style: 'lowerCase'
                };
                const coolName = uniqueNamesGenerator(customConfig);
                const sanitized = coolName.replace(/[^a-z0-9_.]/g, '');
                await addIfUnique(sanitized);
            }

            return NextResponse.json({
                available: false,
                username: username,
                suggestions: suggestions.slice(0, 5)
            });
        }

        // 2. Generate Suggestions
        if (displayName) {
            const base = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const suggestions: string[] = [];

            // Helper to check and add
            const addIfUnique = async (s: string) => {
                if (suggestions.includes(s)) return;
                const exists = await User.findOne({ username: s });
                if (!exists) suggestions.push(s);
            };

            // Strategy 1: Simple variations of base name
            if (base) {
                await addIfUnique(`${base}${Math.floor(Math.random() * 100)}`);
                await addIfUnique(`${base}_${new Date().getFullYear()}`);
            }

            // Strategy 2: Cool generated names using unique-names-generator
            const config: Config = {
                dictionaries: [adjectives, colors, animals],
                separator: '_',
                length: 2,
                style: 'lowerCase'
            };

            // Try to generate a few cool names
            for (let i = 0; i < 5; i++) {
                if (suggestions.length >= 5) break;

                // Mix in the display name sometimes
                let customConfig = { ...config };
                if (base && i % 2 === 0) {
                    customConfig = {
                        dictionaries: [[base], adjectives, animals],
                        separator: '_',
                        length: 3,
                        style: 'lowerCase'
                    };
                }

                const coolName = uniqueNamesGenerator(customConfig);
                // Remove any non-alphanumeric chars except underscore and dot
                const sanitized = coolName.replace(/[^a-z0-9_.]/g, '');
                await addIfUnique(sanitized);
            }

            // Fallback if we still don't have enough
            while (suggestions.length < 3) {
                const randomName = uniqueNamesGenerator({
                    dictionaries: [colors, animals, NumberDictionary.generate({ min: 100, max: 999 })],
                    separator: '_',
                    length: 3,
                    style: 'lowerCase'
                });
                await addIfUnique(randomName);
            }

            return NextResponse.json({ suggestions: suggestions.slice(0, 5) });
        }

        return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });

    } catch (error) {
        console.error('Check username error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
