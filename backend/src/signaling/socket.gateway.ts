// socket.gateway.ts
import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { RoomService } from '../services/room.service';
import { UserModel } from '../models/User';
import { ModerationService } from '../microservices/moderation/moderationService';
import { MatchProposal } from '../models/MatchProposal';
import { ChatModel } from '../models/Chat';
import { MessageModel } from '../models/Message';
import { FriendshipModel } from '../models/Friendship';
import { ActiveRoom } from '../models/ActiveRoom';

/**
 * SocketGateway (Online-Only, Intent-Based, MongoDB)
 * 
 * Migrated from Redis.
 * Uses 'MatchProposal' document for voting state.
 */

export class SocketGateway {
  private io: Server;
  private matchmakingService: MatchmakingService;
  private roomService: RoomService;
  private moderationService: ModerationService;

  // Local user cache
  private userNames: Map<string, string> = new Map();
  private socketToUserId: Map<string, string> = new Map();
  private userIdToSocket: Map<string, string> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.matchmakingService = new MatchmakingService();
    this.roomService = new RoomService();
    this.moderationService = new ModerationService();

    this.initialize();
  }

  private initialize() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[SocketGateway] connected ${socket.id}`);
      this.handleConnection(socket);

      socket.on('set-online', () => this.handleSetOnline(socket));
      socket.on('set-offline', () => this.handleSetOffline(socket)); // Manual "Stop" button
      socket.on('get-recommendations', () => this.handleGetRecommendations(socket));

      // Intent to connect
      socket.on('request-connection', (data) => this.handleRequestConnection(socket, data));

      // Voting (for group join or 1v1 proposal)
      socket.on('vote-entry', (data) => this.handleVoteEntry(socket, data));
      socket.on('recommendation-action', (data) => this.handleProposalVote(socket, data));


      // Signaling
      socket.on('offer', (d) => this.passSignal(socket, 'offer', d));
      socket.on('answer', (d) => this.passSignal(socket, 'answer', d));
      socket.on('ice-candidate', (d) => this.passSignal(socket, 'ice-candidate', d));

      // Actions
      socket.on('leave-room', () => this.handleLeaveRoom(socket));
      socket.on('disconnect', () => this.handleDisconnect(socket));

      // CHAT & FRIENDSHIP
      socket.on('chat-message', (d) => this.handleChatMessage(socket, d));
      socket.on('mark-seen', (d) => this.handleMarkSeen(socket, d));
      socket.on('typing', (d) => this.handleTyping(socket, d));
      socket.on('check-friendship', () => this.handleAutoFriendship(socket));
    });
  }

  private handleConnection(socket: Socket) {
    const { username, userId, displayName } = socket.handshake.query as any;
    this.userNames.set(socket.id, username || displayName || 'Anonymous');
    if (userId) {
      this.socketToUserId.set(socket.id, userId);
      this.userIdToSocket.set(userId, socket.id);
    }
  }

  // 1. User declares they are available
  private async handleSetOnline(socket: Socket) {
    const currentRoom = await this.roomService.getRoomId(socket.id);
    if (currentRoom) {
      console.log(`[SocketGateway] ${socket.id} tried set-online but is in room ${currentRoom}`);
      return;
    }
    await this.matchmakingService.setOnline(socket.id);
    this.attemptAutoMatch(socket);
  }

  private async handleSetOffline(socket: Socket) {
    await this.matchmakingService.setOffline(socket.id);
    this.handleLeaveRoom(socket);
  }

  // 2. Fetch recommendations (Now internal mainly)
  private async handleGetRecommendations(socket: Socket) {
    // Legacy support or fallback
    const state = await this.matchmakingService.getUserState(socket.id);
    if (state !== 'ONLINE') return;

    const candidates = await this.matchmakingService.getRecommendations(socket.id, 5);
    const enriched = await Promise.all(candidates.map(id => this._publicUser(id)));
    socket.emit('recommendations-list', enriched);
  }

  // AUTO-MATCH LOGIC
  private async attemptAutoMatch(socket: Socket) {
    const seekerId = socket.id;
    console.log(`[SocketGateway] Attempting auto-match for ${seekerId}`);

    // Get 1 random candidate
    const candidates = await this.matchmakingService.getRecommendations(seekerId, 1);

    if (candidates.length > 0) {
      const targetId = candidates[0];
      console.log(`[SocketGateway] Auto-match found: ${seekerId} -> ${targetId}`);
      await this._createProposal(seekerId, targetId);
    } else {
      console.log(`[SocketGateway] No candidates for ${seekerId}. Waiting...`);
      // Maybe emit a "waiting" status?
      socket.emit('recommendations-list', []);
    }
  }

  // 3. Request Connection (Manual or Auto)
  private async handleRequestConnection(socket: Socket, data: { targetPeerId: string }) {
    await this._createProposal(socket.id, data.targetPeerId);
  }

  // Shared Proposal Logic
  private async _createProposal(seekerId: string, targetId: string) {
    if (seekerId === targetId) return;

    // Check online status first (optimistic check)
    const seekerState = await this.matchmakingService.getUserState(seekerId);
    const targetState = await this.matchmakingService.getUserState(targetId);

    if (seekerState !== 'ONLINE') return;
    if (!targetState || targetState !== 'ONLINE') return;

    // ATOMIC RESERVATION - DETERMINISTIC ORDER (Avoid Deadlocks)
    // Always lock the "Lower ID" first, then "Higher ID".
    // This ensures that if A and B try to match each other, they both fight for the same first lock.
    const [firstId, secondId] = [seekerId, targetId].sort();

    const reservedFirst = await this.matchmakingService.reserveUser(firstId);
    if (!reservedFirst) {
      console.log(`[SocketGateway] Failed to reserve ${firstId} (First Lock). Match aborted.`);
      // If the seeker was the one who failed (and they initiated), we might want to tell them?
      // But usually this just means they were grabbed by someone else.
      return;
    }

    const reservedSecond = await this.matchmakingService.reserveUser(secondId);
    if (!reservedSecond) {
      console.log(`[SocketGateway] Failed to reserve ${secondId} (Second Lock). Rolling back ${firstId}.`);
      await this.matchmakingService.setOnline(firstId); // Rollback first
      return;
    }

    // Both locked successfully! Proceed.
    const roomId = crypto.randomUUID();
    const proposalId = `proposal:${roomId}`;

    // MongoDB Proposal (TTL 30s initial)
    await MatchProposal.create({
      proposalId,
      roomId,
      participants: [seekerId, targetId],
      votes: {},
      expiresAt: new Date(Date.now() + 30000)
    });

    const seekerMeta = await this._publicUser(seekerId);
    const targetMeta = await this._publicUser(targetId);

    this.io.to(seekerId).emit('proposal-received', {
      type: 'outgoing',
      roomId,
      candidate: targetMeta,
      keyId: targetId,
      participants: [seekerMeta, targetMeta]
    });

    this.io.to(targetId).emit('proposal-received', {
      type: 'incoming',
      roomId,
      candidate: seekerMeta,
      keyId: seekerId,
      participants: [seekerMeta, targetMeta]
    });
  }

  // 4. Voting Logic
  private async handleVoteEntry(socket: Socket, data: { voteId: string, roomId: string, decision: 'accept' | 'skip' }) {
    this.handleProposalVote(socket, { action: data.decision, roomId: data.roomId, recommendedPeerId: data.voteId });
  }

  // Handle votes (accept / skip)
  private async handleProposalVote(socket: Socket, data: { action: 'accept' | 'skip' | 'decline', recommendedPeerId: string, roomId: string }) {
    const { action, roomId } = data;
    const proposalId = `proposal:${roomId}`;

    // Fetch Proposal
    const proposal = await MatchProposal.findOne({ proposalId });

    // Explicit Lazy Expiration Check
    if (!proposal || proposal.expiresAt.getTime() < Date.now()) {
      if (proposal) await MatchProposal.deleteOne({ _id: proposal._id }); // cleanup
      socket.emit('recommendation-ended', { reason: 'timeout' });
      return;
    }

    // Authorization
    if (!proposal.participants.includes(socket.id)) return;

    if (action === 'skip' || action === 'decline') {
      console.log(`[SocketGateway] ${socket.id} REJECTED proposal ${roomId}`);
      await MatchProposal.deleteOne({ proposalId });

      // Notify and Requeue all participants
      proposal.participants.forEach(async (pid) => {
        this.io.to(pid).emit('recommendation-ended', { reason: 'declined', by: socket.id });
        await this.matchmakingService.setOnline(pid);

        // Trigger auto-match for each person
        const peerSocket = this.io.sockets.sockets.get(pid);
        if (peerSocket) {
          this.attemptAutoMatch(peerSocket);
        }
      });
      return;
    }

    if (action === 'accept') {
      proposal.votes.set(socket.id, 'accept');
      await proposal.save();

      const voteCount = proposal.votes.size;

      if (voteCount === 1) {
        // First accept: Shorten timeout to 10s
        proposal.expiresAt = new Date(Date.now() + 10000);
        await proposal.save();

        console.log(`[SocketGateway] First accept for ${roomId}. Timeout shortened to 10s.`);
        socket.emit('recommendation-vote-ack', { status: 'waiting' });

        // Safety check for timeout in case 2nd person never replies
        setTimeout(async () => {
          const pCheck = await MatchProposal.findOne({ proposalId });
          if (pCheck && pCheck.expiresAt.getTime() < Date.now()) {
            console.log(`[SocketGateway] Proposal ${roomId} timed out (safety check).`);
            await MatchProposal.deleteOne({ proposalId });

            pCheck.participants.forEach(async (pid) => {
              this.io.to(pid).emit('recommendation-ended', { reason: 'timeout' });
              // Reset if needed
              const s = await this.matchmakingService.getUserState(pid);
              if (s === 'BUSY') {
                await this.matchmakingService.setOnline(pid);
                const ps = this.io.sockets.sockets.get(pid);
                if (ps) this.attemptAutoMatch(ps);
              }
            });
          }
        }, 11000); // Check slightly after expiration

      } else if (voteCount >= proposal.participants.length) {
        // All accepted
        console.log(`[SocketGateway] All accepted ${roomId}. Creating room.`);

        await MatchProposal.deleteOne({ proposalId });
        await this.roomService.createRoom(roomId, proposal.participants);

        // 🎯 1. CREATE NEW CHAT SESSION
        // 6. CHECK FRIENDSHIP & CHAT HISTORY
        const participantUserIds = proposal.participants
          .map(sid => this.socketToUserId.get(sid))
          .filter(Boolean) as string[];

        let chatId: string | null = null;
        let isFriend = false;
        let historyMessages: any[] = [];

        if (participantUserIds.length === 2) {
          const [userA, userB] = participantUserIds.sort(); // Sort to ensure consistent order for queries

          // Check Friendship
          const friendship = await FriendshipModel.findOne({
            $or: [
              { userId: userA, friendId: userB },
              { userId: userB, friendId: userA }
            ]
          });

          if (friendship) {
            isFriend = true;
          }

          // Find Existing Chat or Create New
          let chat = await ChatModel.findOne({
            participants: { $all: [userA, userB], $size: 2 }
          });

          if (chat) {
            chatId = chat._id.toString();
            // Load History
            historyMessages = await MessageModel.find({ chatId })
              .sort({ timestamp: 1 }) // Oldest first for UI
              .limit(50)
              .lean(); // Use .lean() for plain JS objects
          } else {
            // Create New Chat
            const newChat = await ChatModel.create({
              participants: [userA, userB],
              createdAt: new Date(),
              updatedAt: new Date()
            });
            chatId = newChat._id.toString();
          }
        }

        // Populate peers info
        const peers = await Promise.all(proposal.participants.map(id => this._publicUser(id)));

        // Emit room-created with Chat Info
        proposal.participants.forEach((socketId) => {
          const otherPeers = peers.filter(p => p.peerId !== socketId);
          this.io.to(socketId).emit('room-created', {
            roomId,
            peers: otherPeers,
            chatId,
            isFriend,
          });

          // Emit History if available
          if (historyMessages.length > 0 && chatId) {
            const hydratedHistory = historyMessages.map((msg: any) => {
              // Determine sender's public info for the message
              const senderPublicInfo = peers.find(p => this.socketToUserId.get(p.peerId) === msg.senderId.toString());
              return {
                ...msg,
                senderName: senderPublicInfo?.username || 'Unknown',
                senderAvatar: senderPublicInfo?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`,
              };
            });

            this.io.to(socketId).emit('chat-history', {
              chatId,
              messages: hydratedHistory
            });
          }
          this.io.to(socketId).emit('recommendation-ended', { reason: 'accepted' });
        });
      }
    }
  }

  private async passSignal(socket: Socket, event: string, data: any) {
    const target = data.target;
    this.io.to(target).emit(event, { sender: socket.id, ...data });
  }

  private async handleLeaveRoom(socket: Socket) {
    const roomId = await this.roomService.getRoomId(socket.id);
    if (roomId) {
      await this.roomService.removeUserFromRoom(roomId, socket.id);
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', { socketId: socket.id });

      // Go back online and search
      await this.matchmakingService.setOnline(socket.id);
      this.attemptAutoMatch(socket);
    }
  }

  private async handleDisconnect(socket: Socket) {
    await this.matchmakingService.setOffline(socket.id);
    await this.handleLeaveRoom(socket);

    this.userNames.delete(socket.id);
    const uid = this.socketToUserId.get(socket.id);
    if (uid) {
      this.userIdToSocket.delete(uid);
      this.socketToUserId.delete(socket.id);
    }
  }

  private async _publicUser(socketId: string) {
    const userId = this.socketToUserId.get(socketId);
    let dbUser = null;
    if (userId) {
      try {
        dbUser = await UserModel.findById(userId).select('username avatarUrl');
      } catch (e) { dbUser = null; }
    }
    return {
      peerId: socketId,
      username: dbUser?.username || `User-${socketId.slice(0, 4)}`,
      avatarUrl: dbUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${socketId}`,
    };
  }

  // 🎯 8. HANDLE CHAT MESSAGES
  private async handleChatMessage(socket: Socket, data: { chatId: string, text: string, receiverId?: string, type?: 'text' | 'image' | 'video', mediaData?: string, fileUrl?: string }) {
    console.log(`[SocketGateway] handleChatMessage from ${socket.id}`, { ...data, mediaData: data.mediaData ? 'Base64<...>' : undefined });
    const senderUid = this.socketToUserId.get(socket.id);
    if (!senderUid) {
      console.warn(`[SocketGateway] User not authenticated for socket ${socket.id}`);
      return;
    }

    let targetSocketId = data.receiverId;
    let receiverUserId: string | undefined;

    // Check if receiverId is a User ID map-able to a Socket ID
    if (data.receiverId && this.userIdToSocket.has(data.receiverId)) {
      targetSocketId = this.userIdToSocket.get(data.receiverId);
      receiverUserId = data.receiverId;
    }

    const sender = await this._publicUser(socket.id);
    const senderName = sender?.username || 'Unknown';
    const senderAvatar = sender?.avatarUrl;

    // Determine Status
    const isOnline = !!targetSocketId;
    const initialStatus = isOnline ? 'delivered' : 'sent';

    // 1. Try Direct Emit if targetSocketId is provided
    if (targetSocketId) {
      // Emit to the socket directly
      console.log(`[SocketGateway] Emitting direct message to socket: ${targetSocketId}`);
      this.io.to(targetSocketId).emit('chat-message', {
        senderId: senderUid,
        senderName,
        senderAvatar,
        text: data.text,
        type: data.type || 'text',
        mediaData: data.mediaData,
        fileUrl: data.fileUrl,
        chatId: data.chatId,
        timestamp: new Date(),
        status: initialStatus
      });

      // Resolve userId for DB if not already set (i.e. if we used generic Socket ID)
      if (!receiverUserId) {
        receiverUserId = this.socketToUserId.get(targetSocketId);
        console.log(`[SocketGateway] Resolved receiverUserId from socket: ${receiverUserId}`);
      }
    }

    // 2. Fallback: User not provided or not found? Try inferred from Room
    // (Only if direct emit didn't happen or we want to be safe)
    if (!targetSocketId) {
      const roomId = await this.roomService.getRoomId(socket.id);
      console.log(`[SocketGateway] No receiverId. Fallback to room: ${roomId}`);
      if (roomId) {
        const participants = await this.roomService.getRoomParticipants(roomId);
        const otherPeer = participants.find(p => p !== socket.id);
        if (otherPeer) {
          targetSocketId = otherPeer; // Found
          // If we found them, they are effectively online/delivered for this room context
          this.io.to(otherPeer).emit('chat-message', {
            senderId: senderUid,
            senderName,
            senderAvatar,
            text: data.text,
            type: data.type || 'text',
            mediaData: data.mediaData,
            fileUrl: data.fileUrl,
            chatId: data.chatId,
            timestamp: new Date(),
            status: 'delivered' // In-room is always delivered instantly
          });
          receiverUserId = this.socketToUserId.get(otherPeer);
        } else {
          console.warn(`[SocketGateway] No other peer found in room ${roomId}`);
        }
      } else {
        console.warn(`[SocketGateway] Socket ${socket.id} is not in any room`);
      }
    }

    // 2b. CRITICAL FALLBACK for Offline Persistence
    // If receiverUserId is still undefined, but data.receiverId looks like a UserID (24 chars), use it.
    if (!receiverUserId && data.receiverId && data.receiverId.length === 24) {
      receiverUserId = data.receiverId;
      console.log(`[SocketGateway] receiverUserId set to data.receiverId (Offline/DbOnly): ${receiverUserId}`);
    }

    // 3. Save to DB (Persistent History)
    // We need both User IDs.
    if (senderUid && receiverUserId) {

      let finalChatId = data.chatId;

      // CRITICAL FIX: Frontend might send receiverId as chatId. 
      // We must ensure we have the REAL Chat Document ID.
      // Always look up / create the Chat document based on participants to be safe.
      try {
        // Find chat where these two are participants
        let chat = await ChatModel.findOne({
          participants: { $all: [senderUid, receiverUserId], $size: 2 }
        });

        if (!chat) {
          chat = await ChatModel.create({
            participants: [senderUid, receiverUserId],
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`[SocketGateway] Created new Chat ${chat._id} for message persistence`);
        } else {
          // Update the timestamp of the existing chat
          await ChatModel.updateOne({ _id: chat._id }, { updatedAt: new Date() });
        }
        finalChatId = chat._id.toString();

      } catch (err) {
        console.error('[SocketGateway] Error finding/creating chat for message:', err);
      }

      if (finalChatId) {
        try {
          await MessageModel.create({
            chatId: finalChatId,
            senderId: senderUid,
            receiverId: receiverUserId,
            text: data.text,
            type: data.type || 'text',
            mediaData: data.mediaData,
            fileUrl: data.fileUrl,
            timestamp: new Date(),
            status: initialStatus
          });

          console.log('[SocketGateway] SUCCESS: Message persisted to DB.', {
            sid: senderUid,
            rid: receiverUserId,
            cid: finalChatId
          });

          // Notify Sender of Delivery (if applicable)
          if (initialStatus === 'delivered') {
            socket.emit('message-delivered', {
              messageId: 'pending', // ID not critical for now, timestamp helps
              chatId: finalChatId,
              receiverId: receiverUserId
            });
          }

        } catch (dbErr) {
          console.error('[SocketGateway] Failed to save message to DB:', dbErr);
        }
      } else {
        console.warn(`[SocketGateway] Failed to save message: Could not resolve chatId for ${senderUid}->${receiverUserId}`);
      }
    }
  }

  // 🎯 8b. MARK SEEN
  private async handleMarkSeen(socket: Socket, data: { senderId: string, conversationId?: string }) {
    const readerId = this.socketToUserId.get(socket.id);
    if (!readerId) return;

    // Update DB
    // We want to mark messages FROM data.senderId SENT TO readerId AS 'seen'
    await MessageModel.updateMany(
      {
        senderId: data.senderId,
        receiverId: readerId,
        status: { $ne: 'seen' }
      },
      { status: 'seen', isRead: true }
    );

    // Notify the Sender (that their messages were seen)
    const senderSocketId = this.userIdToSocket.get(data.senderId);
    if (senderSocketId) {
      this.io.to(senderSocketId).emit('message-seen', {
        readerId,
        conversationId: data.conversationId // Optional, for frontend mapping
      });
    }
  }

  // 🎯 2. AUTO-FRIENDSHIP HANDLER
  private async handleAutoFriendship(socket: Socket) {
    const roomId = await this.roomService.getRoomId(socket.id);
    if (!roomId) return;

    const room = await ActiveRoom.findOne({ roomId });
    if (!room) return;

    // Check Duration
    const duration = Date.now() - room.createdAt.getTime();
    if (duration > 90000) { // 90 seconds
      const participants = room.participants;
      if (participants.length < 2) return;

      const uids = participants.map(p => this.socketToUserId.get(p)).filter(Boolean) as string[];
      if (uids.length < 2) return;

      const [userA, userB] = uids;

      // Create Bidirectional Friendship (Two docs or check existing)
      // Using "findOneAndUpdate" with upsert to avoid duplicates
      await FriendshipModel.findOneAndUpdate(
        { userId: userA, friendId: userB },
        { userId: userA, friendId: userB },
        { upsert: true, new: true }
      );
      await FriendshipModel.findOneAndUpdate(
        { userId: userB, friendId: userA },
        { userId: userB, friendId: userA },
        { upsert: true, new: true }
      );

      // Sync legacy User.friends array
      await UserModel.updateOne({ _id: userA }, { $addToSet: { friends: userB } });
      await UserModel.updateOne({ _id: userB }, { $addToSet: { friends: userA } });

      // Notify Users
      participants.forEach(pid => {
        this.io.to(pid).emit('friendship-created', {
          friendId: pid === participants[0] ? uids[1] : uids[0]
        });
      });
      console.log(`[SocketGateway] Auto-Friendship created for ${userA} & ${userB}`);
    }
  }

  // 🎯 9. TYPING INDICATOR
  private async handleTyping(socket: Socket, data: { chatId: string, isTyping: boolean }) {
    const senderUid = this.socketToUserId.get(socket.id);
    if (!senderUid) return;

    const roomId = await this.roomService.getRoomId(socket.id);

    // If we have a roomId (Live Call), broadcast to others in room
    if (roomId) {
      const participants = await this.roomService.getRoomParticipants(roomId);
      const others = participants.filter(p => p !== socket.id);
      others.forEach(pid => {
        this.io.to(pid).emit('typing-update', {
          senderId: senderUid,
          isTyping: data.isTyping
        });
      });
    }
  }
}
