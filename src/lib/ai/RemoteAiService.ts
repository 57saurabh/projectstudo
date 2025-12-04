import axios from 'axios';

// Python Service URL (Localhost for now, update for production)
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_FACE_SERVICE_URL || 'http://localhost:5001';

export class RemoteAiService {

    async analyze(videoElement: HTMLVideoElement): Promise<{ faceDetected: boolean; isSafe: boolean; unsafeScore?: number; reason?: string } | null> {
        try {
            // Capture frame from video
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // Convert to Blob for upload
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
            if (!blob) return null;

            const formData = new FormData();
            formData.append('file', blob, 'frame.jpg');

            // Send to Python Service
            const response = await axios.post(`${AI_SERVICE_URL}/analyze`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;

        } catch (error) {
            console.error('Remote AI Analysis failed:', error);
            return null;
        }
    }
}

export const remoteAiService = new RemoteAiService();
