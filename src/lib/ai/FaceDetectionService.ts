// import * as faceapi from '@vladmandic/face-api';

export class FaceDetectionService {
    private isLoaded = false;
    private options: any = null; // faceapi.TinyFaceDetectorOptions
    private faceapi: any = null;

    async load() {
        if (this.isLoaded || typeof window === 'undefined') return;

        // Dynamic import
        this.faceapi = await import('@vladmandic/face-api');

        // Load models from local public folder
        const MODEL_URL = '/models';

        await Promise.all([
            this.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            // We can add faceLandmark68Net or faceRecognitionNet if needed later
            // this.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);

        this.options = new this.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        this.isLoaded = true;
        console.log('Face-api.js models loaded');
    }

    async detect(videoElement: HTMLVideoElement) {
        if (!this.isLoaded || !this.options || !this.faceapi) return null;

        try {
            // Detect single face
            const result = await this.faceapi.detectSingleFace(videoElement, this.options);
            return result;
        } catch (error) {
            console.warn("Face detection error:", error);
            return null;
        }
    }
}

export const faceDetectionService = new FaceDetectionService();

