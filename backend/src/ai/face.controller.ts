import express, { Request, Response } from 'express';
import { FaceService } from './face.service';

export class FaceController {
    public router = express.Router();
    private faceService: FaceService;

    constructor() {
        this.faceService = new FaceService();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/detect-face', this.detectFace.bind(this));
    }

    private async detectFace(req: Request, res: Response) {
        try {
            const { image } = req.body; // Expecting base64 string

            if (!image) {
                return res.status(400).json({ message: 'Image data required' });
            }

            // Strip metadata if present
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');

            const result = await this.faceService.detectFace(buffer);

            return res.json(result);

        } catch (error: any) {
            console.error('Face Detection Error:', error);
            return res.status(500).json({ message: error.message || 'Detection failed' });
        }
    }
}
