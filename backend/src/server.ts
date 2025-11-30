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

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || '';
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ Connected to MongoDB'))
        .catch(err => console.error('❌ MongoDB Connection Error:', err));
} else {
    console.warn('⚠️ MONGO_URI not found in .env');
}

// Initialize WebSocket Gateway
new SocketGateway(io);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`🚀 Backend Server running on port ${PORT}`);
});
