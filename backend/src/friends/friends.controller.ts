import express from 'express';
import { FriendService } from './friends.service';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export class FriendController {
    public router = express.Router();
    private friendService: FriendService;

    constructor(friendService: FriendService) {
        this.friendService = friendService;
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/', this.getFriends);
        this.router.get('/requests', this.getPendingRequests);
        this.router.post('/send', this.sendRequest);
        this.router.post('/accept', this.acceptRequest);
        this.router.post('/reject', this.rejectRequest);
    }

    private getUserIdFromToken(req: express.Request): string | null {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                // Debug logging
                console.log('Verifying token:', token.substring(0, 10) + '...');
                console.log('Using secret:', JWT_SECRET === 'super-secret-key' ? 'default' : 'env');

                const decoded: any = jwt.verify(token, JWT_SECRET);
                return decoded.id || decoded.userId;
            } catch (err: any) {
                console.error('Token verification failed:', err.message);
                return null;
            }
        }
        console.log('No auth header or invalid format');
        return null;
    }

    private getFriends = async (req: express.Request, res: express.Response) => {
        try {
            const userId = this.getUserIdFromToken(req);
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const friends = await this.friendService.getFriends(userId);
            res.json(friends);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    private getPendingRequests = async (req: express.Request, res: express.Response) => {
        try {
            const userId = this.getUserIdFromToken(req);
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const requests = await this.friendService.getPendingRequests(userId);
            res.json(requests);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    private sendRequest = async (req: express.Request, res: express.Response) => {
        try {
            const { receiverId } = req.body;
            const senderId = this.getUserIdFromToken(req);

            if (!senderId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const request = await this.friendService.sendFriendRequest(senderId, receiverId);
            res.json(request);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    private acceptRequest = async (req: express.Request, res: express.Response) => {
        try {
            const { requestId } = req.body; // Removed userId from body, getting from token
            const userId = this.getUserIdFromToken(req);

            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const request = await this.friendService.acceptFriendRequest(requestId, userId);
            res.json(request);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    private rejectRequest = async (req: express.Request, res: express.Response) => {
        try {
            const { requestId } = req.body; // Removed userId from body, getting from token
            const userId = this.getUserIdFromToken(req);

            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const request = await this.friendService.rejectFriendRequest(requestId, userId);
            res.json(request);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };
}
