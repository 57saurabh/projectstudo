import * as tf from '@tensorflow/tfjs-node';
import * as faceapi from '@vladmandic/face-api';
import { Canvas, Image, ImageData, createCanvas, loadImage } from 'canvas';

// Patch face-api environment for Node.js
const { Canvas: CanvasPolyfill, Image: ImagePolyfill, ImageData: ImageDataPolyfill } = require('canvas');
faceapi.env.monkeyPatch({ Canvas: CanvasPolyfill, Image: ImagePolyfill, ImageData: ImageDataPolyfill });

// Set TensorFlow backend to CPU to avoid GPU issues on Render
tf.setBackend('cpu');

export class FaceService {
    private isLoaded = false;
    private options: faceapi.TinyFaceDetectorOptions | null = null;

    constructor() {
        this.loadModels();
    }

    private async loadModels() {
        try {
            console.log('⏳ Loading Face Detection Models...');

            // Load Face API Models from CDN
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            this.options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
            this.isLoaded = true;
            console.log('✅ Face Detection Models loaded');

        } catch (error) {
            console.error('❌ Failed to load Face Detection models:', error);
        }
    }

    async detectFace(imageBuffer: Buffer) {
        if (!this.isLoaded || !this.options) {
            throw new Error('Face Detection Models not loaded yet');
        }

        try {
            // Load image for Face API (Canvas)
            const img = await loadImage(imageBuffer);

            // Detect single face
            const detection = await faceapi.detectSingleFace(img as any, this.options);

            return {
                faceDetected: !!detection,
                score: detection ? detection.score : 0
            };

        } catch (error) {
            console.error('Face Detection error:', error);
            throw new Error('Failed to detect face');
        }
    }
}
