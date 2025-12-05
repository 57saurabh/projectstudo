import express from 'express';
import { UsersService } from './users.service';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export class UsersController {
    public router = express.Router();
    private usersService: UsersService;

    constructor() {
        this.usersService = new UsersService();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/search', this.searchUsers);
        this.router.get('/:id', this.getUserProfile);
        this.router.put('/me', this.updateProfile); // Added update route
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

    private getUserProfile = async (req: express.Request, res: express.Response) => {
        try {
            // Optional: Check if requesting own profile or public
            const user = await this.usersService.getUserProfile(req.params.id);
            res.json(user);
        } catch (error: any) {
            res.status(404).json({ message: error.message });
        }
    };

    private updateProfile = async (req: express.Request, res: express.Response) => {
        try {
            const userId = this.getUserIdFromToken(req);
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const allowedUpdates = [
                'displayName', 'username', 'bio', 'website', 'profession',
                'gender', 'age', 'country', 'region', 'university',
                'interests', 'languages', 'languageCountries', 'avatarUrl', 'theme'
            ];

            const updates = Object.keys(req.body)
                .filter(key => allowedUpdates.includes(key))
                .reduce((obj: any, key) => {
                    obj[key] = req.body[key];
                    return obj;
                }, {});

            const user = await this.usersService.updateUser(userId, updates);
            res.json(user);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    private searchUsers = async (req: express.Request, res: express.Response) => {
        try {
            const query = req.query.q as string;
            const users = await this.usersService.searchUsers(query);
            res.json(users);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };
}
