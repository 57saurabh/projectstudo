import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';

// Enable TFJS backend (WebGL)
tf.setBackend('webgl');

export class ModerationService {
    private model: nsfwjs.NSFWJS | null = null;

    async load() {
        // Load the model from a public CDN or local path
        // Using the default model hosted on GitHub Pages by the nsfwjs team
        this.model = await nsfwjs.load();
    }

    async checkContent(videoElement: HTMLVideoElement): Promise<nsfwjs.PredictionType[] | null> {
        if (!this.model) return null;

        // Classify the image
        const predictions = await this.model.classify(videoElement);
        return predictions;
    }

    isSafe(predictions: nsfwjs.PredictionType[]): { safe: boolean; reason?: string } {
        // Categories: 'Drawing', 'Hentai', 'Neutral', 'Porn', 'Sexy'

        const porn = predictions.find(p => p.className === 'Porn');
        const hentai = predictions.find(p => p.className === 'Hentai');
        const sexy = predictions.find(p => p.className === 'Sexy');

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
