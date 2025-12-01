import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class FaceDetectionService {
    private faceLandmarker: FaceLandmarker | null = null;
    private runningMode: "IMAGE" | "VIDEO" = "VIDEO";

    async load() {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: false,
            runningMode: this.runningMode,
            numFaces: 1
        });
    }

    detect(videoElement: HTMLVideoElement, startTimeMs: number) {
        if (!this.faceLandmarker) return null;
        try {
            return this.faceLandmarker.detectForVideo(videoElement, startTimeMs);
        } catch (error) {
            console.warn("Face detection error:", error);
            return null;
        }
    }
}

export const faceDetectionService = new FaceDetectionService();
