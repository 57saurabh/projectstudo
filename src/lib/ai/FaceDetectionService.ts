import * as faceapi from '@vladmandic/face-api';

export class FaceDetectionService {
    private isLoaded = false;
    private options: faceapi.TinyFaceDetectorOptions | null = null;

    async load() {
        if (this.isLoaded) return;

        // Load models from CDN
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            // We can add faceLandmark68Net or faceRecognitionNet if needed later
            // faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);

        this.options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        this.isLoaded = true;
        console.log('Face-api.js models loaded');
    }

    async detect(videoElement: HTMLVideoElement) {
        if (!this.isLoaded || !this.options) return null;

        try {
            // Detect single face
            const result = await faceapi.detectSingleFace(videoElement, this.options);
            return result;
        } catch (error) {
            console.warn("Face detection error:", error);
            return null;
        }
    }
}

export const faceDetectionService = new FaceDetectionService();
