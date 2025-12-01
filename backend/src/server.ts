import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { SocketGateway } from './signaling/socket.gateway';

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

        server.listen(PORT, () => {
            console.log(`🚀 Backend Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
