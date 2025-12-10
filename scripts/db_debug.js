
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load env manually
try {
    const envPath = path.join(__dirname, '../backend/.env');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) {
            process.env[key.trim()] = val.trim();
        }
    });
} catch (e) {
    console.log('Could not load .env file, hoping env vars are set');
}

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
        let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) throw new Error('MONGO_URI not found');

        // Robustly clean query params
        if (mongoUri.includes('?')) {
            const parts = mongoUri.split('?');
            const base = parts[0];
            const query = parts.slice(1).join('?'); // handle multiple ? just in case? No, usually one.
            const newQuery = query.split('&')
                .filter(p => !p.match(/^appName=$/) && !p.match(/^appName=&/) && p !== 'appName')
                .join('&');
            mongoUri = newQuery ? `${base}?${newQuery}` : base;
        }

        console.log('Connecting with sanitized URI...');
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const users = await UserModel.find().limit(5);
        console.log('--- USERS (Sample 5) ---');
        users.forEach(u => console.log(`${u._id}: ${u.username} (${u.displayName})`));

        // Find messages where chatId looks like a UserID (length 24) but might not be a chat?
        // Actually just dump last 20 messages.
        const messages = await MessageModel.find().sort({ timestamp: -1 }).limit(20);
        console.log('\n--- MESSAGES (Last 20) ---');
        messages.forEach(m => console.log(`[${m.timestamp ? m.timestamp.toISOString() : 'no-time'}] Type:${m.type} | ${m.senderId} -> ${m.receiverId} | ChatId: ${m.chatId}`));

        const chats = await ChatModel.find().limit(5);
        console.log('\n--- CHATS (Sample 5) ---');
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
