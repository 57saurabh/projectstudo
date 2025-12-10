import express from 'express';
import { MessagesService } from './messages.service';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class MessagesController {
    public router = express.Router();
    private messagesService: MessagesService;

    constructor() {
        this.messagesService = new MessagesService();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/', this.getConversations);
        this.router.get('/unread', this.getUnreadCount);
        this.router.get('/:userId', this.getMessages);
    }

    private getUserIdFromToken(req: express.Request): string | null {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded: any = jwt.verify(token, JWT_SECRET);
                return decoded.id || decoded.userId; // Handle both id and userId for compatibility
            } catch (err) {
                return null;
            }
        }
        return null;
    }

    private getConversations = async (req: express.Request, res: express.Response) => {
        try {
            const userId = this.getUserIdFromToken(req);
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const conversations = await this.messagesService.getConversations(userId);
            res.json(conversations);
        } catch (error: any) {
            console.error('Error fetching conversations:', error);
            res.status(500).json({ message: error.message });
        }
    };

    private getMessages = async (req: express.Request, res: express.Response) => {
        try {
            const userId = this.getUserIdFromToken(req);
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const targetUserId = req.params.userId;
            const data = await this.messagesService.getMessages(userId, targetUserId);
            res.json(data);
        } catch (error: any) {
            console.error('Error fetching messages:', error);
            res.status(500).json({ message: error.message });
        }
    };

    private getUnreadCount = async (req: express.Request, res: express.Response) => {
        try {
            const userId = this.getUserIdFromToken(req);
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const data = await this.messagesService.getUnreadCount(userId);
            res.json(data);
        } catch (error: any) {
            console.error('Error fetching unread count:', error);
            res.status(500).json({ message: error.message });
        }
    };
}
