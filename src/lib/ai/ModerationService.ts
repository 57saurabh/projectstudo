// import * as nsfwjs from 'nsfwjs';
// import * as tf from '@tensorflow/tfjs';

export class ModerationService {
    private model: any = null; // nsfwjs.NSFWJS

    async load() {
        if (typeof window === 'undefined') return;

        // Dynamic import to avoid server-side execution
        const tf = await import('@tensorflow/tfjs');
        const nsfwjs = await import('nsfwjs');

        // Enable TFJS backend (WebGL)
        tf.setBackend('webgl');

        // Load the model
        this.model = await nsfwjs.load();
    }

    async checkContent(videoElement: HTMLVideoElement): Promise<any[] | null> {
        if (!this.model) return null;

        // Classify the image
        const predictions = await this.model.classify(videoElement);
        return predictions;
    }

    isSafe(predictions: any[]): { safe: boolean; reason?: string } {
        // Categories: 'Drawing', 'Hentai', 'Neutral', 'Porn', 'Sexy'

        const porn = predictions.find((p: any) => p.className === 'Porn');
        const hentai = predictions.find((p: any) => p.className === 'Hentai');
        const sexy = predictions.find((p: any) => p.className === 'Sexy');

        // Thresholds
        // Strict on Porn/Hentai
        if (porn && porn.probability > 0.5) return { safe: false, reason: 'Nudity detected' };
        if (hentai && hentai.probability > 0.5) return { safe: false, reason: 'Inappropriate content detected' };

        // "Sexy" usually catches shirtless/underwear. User asked for "shirtless" detection.
        // We'll set a reasonable threshold.
        if (sexy && sexy.probability > 0.7) return { safe: false, reason: 'Inappropriate attire detected' };

        return { safe: true };
    }
}

export const moderationService = new ModerationService();

