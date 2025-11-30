import { NextResponse } from 'next/server';
import axios from 'axios';

// Get the Face Service URL from env, default to localhost for server-side call
const FACE_SERVICE_URL = process.env.NEXT_PUBLIC_FACE_SERVICE_URL || 'http://localhost:5001/detect-face';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
        }

        // Create a new FormData instance to forward
        const forwardData = new FormData();
        forwardData.append('file', file);

        // Forward to Python Face Service
        // Note: We are on the server now, so we can talk to localhost:5001
        const response = await axios.post(FACE_SERVICE_URL, forwardData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 5000 // 5s timeout
        });

        return NextResponse.json(response.data);

    } catch (error: any) {
        console.error('Face Proxy Error:', error.message);
        // Handle connection refused (service not running)
        if (error.code === 'ECONNREFUSED') {
            return NextResponse.json(
                { faceDetected: false, error: 'Face Service unavailable' },
                { status: 503 }
            );
        }
        return NextResponse.json(
            { message: 'Face detection failed' },
            { status: 500 }
        );
    }
}
