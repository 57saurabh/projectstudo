import express from 'express';
import { FriendService } from './friends.service';

export class FriendController {
    public router = express.Router();
    private friendService: FriendService;

    constructor(friendService: FriendService) {
        this.friendService = friendService;
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/send', this.sendRequest);
        this.router.post('/accept', this.acceptRequest);
        this.router.post('/reject', this.rejectRequest);
    }

    private sendRequest = async (req: express.Request, res: express.Response) => {
        try {
            const { senderId, receiverId } = req.body;
            const request = await this.friendService.sendFriendRequest(senderId, receiverId);
            res.json(request);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    private acceptRequest = async (req: express.Request, res: express.Response) => {
        try {
            const { requestId, userId } = req.body;
            const request = await this.friendService.acceptFriendRequest(requestId, userId);
            res.json(request);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    private rejectRequest = async (req: express.Request, res: express.Response) => {
        try {
            const { requestId, userId } = req.body;
            const request = await this.friendService.rejectFriendRequest(requestId, userId);
            res.json(request);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };
}
