import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Message from '@backend/src/chat/message.model';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Decryption Utility (Must match backend)
function decryptMessage(encryptedText: string): string {
    try {
        const [ivHex, encryptedHex] = encryptedText.split(':');
        if (!ivHex || !encryptedHex) return encryptedText; // Return as is if not encrypted properly

        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(process.env.JWT_SECRET || 'secret', 'salt', 32);
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Decryption failed:', error);
        return '*** Decryption Error ***';
    }
}

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
    try {
        await dbConnect();

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const decoded: any = jwt.verify(token, JWT_SECRET);
        const currentUserId = decoded.userId;
        const targetUserId = params.userId;

        const messages = await Message.find({
            $or: [
                { senderId: currentUserId, receiverId: targetUserId },
                { senderId: targetUserId, receiverId: currentUserId }
            ]
        }).sort({ timestamp: 1 });

        // Decrypt messages before sending
        const decryptedMessages = messages.map(msg => ({
            ...msg.toObject(),
            text: decryptMessage(msg.text)
        }));

        return NextResponse.json(decryptedMessages);

    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
