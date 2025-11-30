import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
    public router: Router;
    private authService: AuthService;

    constructor() {
        this.router = Router();
        this.authService = new AuthService();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/login', this.login.bind(this));
        this.router.post('/signup', this.signup.bind(this));
    }

    private async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required' });
            }

            const result = await this.authService.login({ email, password });
            res.json(result);
        } catch (error: any) {
            res.status(401).json({ message: error.message || 'Authentication failed' });
        }
    }

    private async signup(req: Request, res: Response) {
        try {
            const { email, password, displayName } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required' });
            }

            const result = await this.authService.signup({ email, password, displayName });
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message || 'Signup failed' });
        }
    }
}
