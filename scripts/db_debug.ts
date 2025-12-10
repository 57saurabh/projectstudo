
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const MessageSchema = new mongoose.Schema({
    senderId: String,
    receiverId: String,
    text: String,
    chatId: String,
    type: String,
    timestamp: Date
});
const MessageModel = mongoose.model('Message', MessageSchema);

const ChatSchema = new mongoose.Schema({
    participants: [String],
    createdAt: Date,
    updatedAt: Date
});
const ChatModel = mongoose.model('Chat', ChatSchema);

const UserSchema = new mongoose.Schema({
    displayName: String,
    username: String,
    email: String
});
const UserModel = mongoose.model('User', UserSchema);

async function run() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) throw new Error('MONGO_URI not found');

        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const users = await UserModel.find().limit(5);
        console.log('--- USERS (First 5) ---');
        users.forEach(u => console.log(`${u._id}: ${u.username} (${u.displayName})`));

        const messages = await MessageModel.find().sort({ timestamp: -1 }).limit(10);
        console.log('\n--- MESSAGES (Last 10) ---');
        messages.forEach(m => console.log(`[${m.timestamp?.toISOString()}] ${m.type} | ${m.senderId} -> ${m.receiverId} | ChatId: ${m.chatId}`));

        const chats = await ChatModel.find().limit(5);
        console.log('\n--- CHATS (First 5) ---');
        chats.forEach(c => console.log(`${c._id}: [${c.participants.join(', ')}] Updated: ${c.updatedAt}`));

        const msgCount = await MessageModel.countDocuments();
        console.log(`\nTotal Messages: ${msgCount}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
