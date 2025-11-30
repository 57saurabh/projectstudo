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
        this.router.put('/me', this.updateMe.bind(this));
    }

    private async getMe(req: Request, res: Response) {
        try {
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

    private async updateMe(req: Request, res: Response) {
        try {
            const userId = req.headers['x-user-id'] as string;

            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const updateData = req.body;
            const updatedUser = await this.userService.updateUser(userId, updateData);

            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json(updatedUser);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}
