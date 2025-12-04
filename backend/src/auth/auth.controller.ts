import express from 'express';
import { AuthService } from './auth.service';

export class AuthController {
    public router = express.Router();
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/signup', this.signup);
        this.router.post('/login', this.login);
    }

    private signup = async (req: express.Request, res: express.Response) => {
        try {
            const result = await this.authService.signup(req.body);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    private login = async (req: express.Request, res: express.Response) => {
        try {
            const result = await this.authService.login(req.body);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };
}
