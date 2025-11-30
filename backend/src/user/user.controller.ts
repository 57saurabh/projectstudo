import { Router, Request, Response } from 'express';
import { UserService } from './user.service';

export class UserController {
    public router: Router;
    private userService: UserService;

    constructor() {
        this.router = Router();
        this.userService = new UserService();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/me', this.getMe.bind(this));
    }

    private async getMe(req: Request, res: Response) {
        try {
            // Assuming middleware attaches user to req (we need to implement/verify auth middleware)
            // For now, we'll expect userId in headers for simplicity or implement a proper middleware later
            // But wait, we don't have auth middleware in server.ts yet.
            // Let's rely on the client sending the ID for now, OR better, implement a simple token verification.

            // TEMPORARY: Expecting 'x-user-id' header for dev speed, or we can decode token.
            // Let's try to decode the token if possible, or just pass ID.

            const userId = req.headers['x-user-id'] as string;

            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const user = await this.userService.getUserById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json(user);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}
