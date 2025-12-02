import * as tf from '@tensorflow/tfjs-node';
import * as nsfwjs from 'nsfwjs';
import * as faceapi from '@vladmandic/face-api';
import { Canvas, Image, ImageData, createCanvas, loadImage } from 'canvas';
import path from 'path';

// Patch face-api environment for Node.js
const { Canvas: CanvasPolyfill, Image: ImagePolyfill, ImageData: ImageDataPolyfill } = require('canvas');
faceapi.env.monkeyPatch({ Canvas: CanvasPolyfill, Image: ImagePolyfill, ImageData: ImageDataPolyfill });

export class AiService {
    private nsfwModel: nsfwjs.NSFWJS | null = null;
    private isFaceApiLoaded = false;
    private faceOptions: faceapi.TinyFaceDetectorOptions | null = null;

    constructor() {
        this.loadModels();
    }

    private async loadModels() {
        try {
            console.log('⏳ Loading AI Models...');

            // Load NSFW Model
            // Using default model from nsfwjs (hosted on GitHub)
            // For production, better to download and serve locally
            this.nsfwModel = await nsfwjs.load();
            console.log('✅ NSFW Model loaded');

            // Load Face API Models
            // We need to point to a local directory or use the CDN
            // For backend, let's use the CDN for simplicity or download them.
            // Using CDN for now, but ideally should be local.
            // Note: face-api in node might need fetch polyfill if not present, but tfjs-node handles some.
            // Actually, let's try to load from disk if possible, or CDN.
            // Since we don't have models on disk in backend yet, we'll use loadFromDisk if we download them,
            // or loadFromUri.
            // Let's use the same CDN as frontend for consistency.
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            this.faceOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
            this.isFaceApiLoaded = true;
            console.log('✅ Face API Models loaded');

        } catch (error) {
            console.error('❌ Failed to load AI models:', error);
        }
    }

    async analyzeImage(imageBuffer: Buffer) {
        if (!this.nsfwModel || !this.isFaceApiLoaded || !this.faceOptions) {
            throw new Error('AI Models not loaded yet');
        }

        try {
            // 1. Load image for TFJS (NSFW)
            const tfImage = await tf.node.decodeImage(imageBuffer, 3);

            // 2. Load image for Face API (Canvas)
            const img = await loadImage(imageBuffer);

            // Run predictions in parallel
            const [nsfwPredictions, faceDetection] = await Promise.all([
                this.nsfwModel.classify(tfImage as any),
                faceapi.detectSingleFace(img as any, this.faceOptions)
            ]);

            // Cleanup TFJS tensor
            tfImage.dispose();

            // Process NSFW results
            const isSafe = this.checkSafety(nsfwPredictions);

            // Process Face results
            const faceDetected = !!faceDetection;

            return {
                faceDetected,
                isSafe: isSafe.safe,
                unsafeReason: isSafe.reason,
                nsfwPredictions // Optional: return full predictions for debugging
            };

        } catch (error) {
            console.error('Analysis error:', error);
            throw new Error('Failed to analyze image');
        }
    }

    private checkSafety(predictions: nsfwjs.PredictionType[]): { safe: boolean; reason?: string } {
        const porn = predictions.find(p => p.className === 'Porn');
        const hentai = predictions.find(p => p.className === 'Hentai');
        const sexy = predictions.find(p => p.className === 'Sexy');

        if (porn && porn.probability > 0.5) return { safe: false, reason: 'Nudity detected' };
        if (hentai && hentai.probability > 0.5) return { safe: false, reason: 'Inappropriate content detected' };
        if (sexy && sexy.probability > 0.7) return { safe: false, reason: 'Inappropriate attire detected' };

        return { safe: true };
    }
}
