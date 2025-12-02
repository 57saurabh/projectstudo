import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class RemoteFaceDetectionService {

    async detect(videoElement: HTMLVideoElement): Promise<{ faceDetected: boolean; score: number } | null> {
        try {
            // Capture frame from video
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const base64Image = canvas.toDataURL('image/jpeg', 0.7); // Compress to 0.7 quality

            // Send to backend
            const response = await axios.post(`${API_URL}/ai/detect-face`, { image: base64Image });
            return response.data;

        } catch (error) {
            console.error('Remote Face Detection failed:', error);
            return null;
        }
    }
}

export const remoteFaceDetectionService = new RemoteFaceDetectionService();
