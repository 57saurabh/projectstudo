import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { SocketGateway } from './signaling/socket.gateway';
import { FriendService } from './friends/friends.service';
import { FriendController } from './friends/friends.controller';
import { MessagesController } from './messages/messages.controller';
import { LiveController } from './live/live.controller';
import { UsersController } from './users/users.controller';
import { AiController } from './ai/ai.controller';

dotenv.config();

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

        // Initialize AI Module
        const aiController = new AiController();
        app.use('/api/ai', aiController.router);

        server.listen(PORT, () => {
            console.log(`🚀 Backend Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
