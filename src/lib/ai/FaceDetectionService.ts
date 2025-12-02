// import * as faceapi from '@vladmandic/face-api';

export class FaceDetectionService {
    private isLoaded = false;
    private options: any = null; // faceapi.TinyFaceDetectorOptions

    async load() {
        if (this.isLoaded || typeof window === 'undefined') return;

        // Wait for script to load if needed
        const waitForFaceApi = () => new Promise<void>((resolve) => {
            if ((window as any).faceapi) return resolve();
            const interval = setInterval(() => {
                if ((window as any).faceapi) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });

        await waitForFaceApi();
        const faceapi = (window as any).faceapi;

        // Load models from local public folder
        const MODEL_URL = '/models';

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            // We can add faceLandmark68Net or faceRecognitionNet if needed later
            // faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);

        this.options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        this.isLoaded = true;
        console.log('Face-api.js models loaded (CDN)');
    }

    async detect(videoElement: HTMLVideoElement) {
        if (!this.isLoaded || !this.options || typeof window === 'undefined') return null;
        const faceapi = (window as any).faceapi;
        if (!faceapi) return null;

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


