import dotenv from 'dotenv';
import path from 'path';

// Load environment variables immediately
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import { SocketGateway } from './signaling/socket.gateway';
import { FriendService } from './friends/friends.service';
import { FriendController } from './friends/friends.controller';
import { MessagesController } from './messages/messages.controller';
import { LiveController } from './live/live.controller';
import { UsersController } from './users/users.controller';
import { AuthController } from './auth/auth.controller';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all for dev
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

async function startServer() {
    try {
        // Connect to MongoDB
        const MONGO_URI = process.env.MONGO_URI || '';
        if (!MONGO_URI) {
            throw new Error('MONGO_URI not found in .env');
        }

        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Initialize WebSocket Gateway
        new SocketGateway(io);

        // Initialize Auth Module
        const authController = new AuthController();
        app.use('/api/auth', authController.router);

        // Initialize Friend Module
        const friendService = new FriendService(io);
        const friendController = new FriendController(friendService);
        app.use('/api/friends', friendController.router);
        app.use('/friend-request', friendController.router); // Keep for legacy if needed

        // Initialize Messages Module
        const messagesController = new MessagesController();
        app.use('/api/messages', messagesController.router);

        // Initialize Live Module
        const liveController = new LiveController();
        app.use('/api/live', liveController.router);

        // Initialize Users Module
        const usersController = new UsersController();
        app.use('/api/users', usersController.router);
        app.use('/api/user', usersController.router); // Alias for singular route consistency

        server.listen(PORT, () => {
            console.log(`🚀 Backend Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
