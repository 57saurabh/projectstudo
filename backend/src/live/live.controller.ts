import express from 'express';
import { LiveService } from './live.service';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class LiveController {
    public router = express.Router();
    private liveService: LiveService;

    constructor() {
        this.liveService = new LiveService();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/', this.startSession);
        this.router.put('/', this.stopSession);
        this.router.get('/:id/status', this.getSessionStatus);
        this.router.get('/:id/comments', this.getComments);
    }

    private getUserIdFromToken(req: express.Request): string | null {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded: any = jwt.verify(token, JWT_SECRET);
                return decoded.id || decoded.userId;
            } catch (err) {
                return null;
            }
        }
        return null;
    }

    private startSession = async (req: express.Request, res: express.Response) => {
        try {
            const userId = this.getUserIdFromToken(req);
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const session = await this.liveService.startSession(userId, req.body);
            res.json(session);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    private stopSession = async (req: express.Request, res: express.Response) => {
        try {
            const userId = this.getUserIdFromToken(req);
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const { sessionId } = req.body;
            const session = await this.liveService.stopSession(userId, sessionId);
            res.json(session);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    private getSessionStatus = async (req: express.Request, res: express.Response) => {
        try {
            const session = await this.liveService.getSessionStatus(req.params.id);
            res.json(session);
        } catch (error: any) {
            res.status(404).json({ message: error.message });
        }
    };

    private getComments = async (req: express.Request, res: express.Response) => {
        try {
            const comments = await this.liveService.getComments(req.params.id);
            res.json(comments);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };
}
