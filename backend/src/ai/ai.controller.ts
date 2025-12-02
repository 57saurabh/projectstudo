import express, { Request, Response } from 'express';
import { AiService } from './ai.service';

export class AiController {
    public router = express.Router();
    private aiService: AiService;

    constructor() {
        this.aiService = new AiService();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/analyze', this.analyze.bind(this));
    }

    private async analyze(req: Request, res: Response) {
        try {
            const { image } = req.body; // Expecting base64 string: "data:image/jpeg;base64,..."

            if (!image) {
                return res.status(400).json({ message: 'Image data required' });
            }

            // Strip metadata if present
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');

            const result = await this.aiService.analyzeImage(buffer);

            return res.json(result);

        } catch (error: any) {
            console.error('AI Analysis Error:', error);
            return res.status(500).json({ message: error.message || 'Analysis failed' });
        }
    }
}
