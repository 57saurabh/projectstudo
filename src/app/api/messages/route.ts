import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { MessageModel as Message } from "@/models/Message";
import { UserModel as User } from "@/models/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const token = req.headers.get("authorization")?.split(" ")[1];
        if (!token) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const decoded: any = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const { ConversationModel } = await import("@/models/Conversation");

        const conversations = await ConversationModel.find({
            "participants.userId": userId,
        }).sort({ updatedAt: -1 });

        const formattedConversations = await Promise.all(
            conversations.map(async (conv: any) => {
                const otherParticipant = conv.participants.find(
                    (p: any) => p.userId !== userId
                );

                if (!otherParticipant) return null;

                const otherUser = await User.findById(otherParticipant.userId)
                    .select("displayName username avatarUrl");

                if (!otherUser) return null;

                return {
                    _id: otherUser._id,
                    conversationId: conv._id,
                    displayName: otherUser.displayName,
                    username: otherUser.username,
                    avatarUrl: otherUser.avatarUrl,
                    lastMessage: conv.lastMessage?.text || null,
                    lastMessageTimestamp: conv.lastMessage?.timestamp || null,
                    unreadCount: conv.unreadCount?.get(userId) || 0,
                    isFriend: false,
                };
            })
        );

        const validConversations = formattedConversations.filter(Boolean);

        const currentUser = await User.findById(userId).select("friends");
        const friendIds = currentUser?.friends.map((id: any) => id.toString()) || [];

        const finalConversations = validConversations.map((conv: any) => ({
            ...conv,
            isFriend: friendIds.includes(conv._id.toString()),
        }));

        return NextResponse.json(finalConversations);
    } catch (error: any) {
        console.error("Error fetching conversations:", error);
        return NextResponse.json(
            {
                message: "Internal Server Error",
                error: error.message,
            },
            { status: 500 }
        );
    }
}
