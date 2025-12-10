'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCallStore } from '../store/useCallStore';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import axios from 'axios';
import { toast } from 'sonner';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

interface SignalingContextType {
    socket: Socket | null;
    findMatch: () => void;
    acceptMatch: (targetId: string) => void;
    inviteUser: (targetId: string) => void;
    acceptInvite: (senderId: string) => void;
    rejectInvite: () => void;
    sendMessage: (targetId: string, text: string) => void;
    skipMatch: (targetId?: string) => void;
    addRandomUser: () => void;
    getOnlineUsers: () => void;
    unreadCount: number;
    markAsRead: (senderId: string) => void;
    sendTyping: (isTyping: boolean) => void;
}

const SignalingContext = createContext<SignalingContextType | null>(null);

export const SignalingProvider = ({ children }: { children: React.ReactNode }) => {
    // Use state to trigger re-renders when socket is created
    const [socket, setSocket] = useState<Socket | null>(null);
    const socketRef = useRef<Socket | null>(null); // Keep ref for internal robust access in callbacks
    const { user, token } = useSelector((state: RootState) => state.auth);
    const {
        addParticipant,
        removeParticipant,
        setCallState,
        // setProposal and clearProposal will be accessed via getState to avoid deps
    } = useCallStore();

    const [unreadCount, setUnreadCount] = React.useState(0);

    const fetchUnreadCount = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get('/api/messages/unread', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(res.data.count);
        } catch (error) {
            console.error('Failed to fetch unread count', error);
        }
    }, [token]);

    const markAsRead = useCallback((senderId: string) => {
        if (!socketRef.current) return;
        socketRef.current.emit('mark-read', { senderId });
        setTimeout(fetchUnreadCount, 500);
    }, [fetchUnreadCount]);

    const resetCall = useCallback(() => {
        console.trace('[SignalingContext] resetCall triggered');
        const store = useCallStore.getState();
        store.setCallState('idle');
        store.setParticipants([]);
        store.clearProposal();
        store.setCurrentRoomId(null);
        store.setChatId(null);
        store.setMessages([]);
        store.setIsFriend(false);
    }, []);

    const findMatch = useCallback(() => {
        setCallState('searching');
        socketRef.current?.emit('find-match');
    }, [setCallState]);

    const acceptMatch = useCallback((targetId: string) => {
        if (!socketRef.current) return;
        const { proposal } = useCallStore.getState();
        if (!proposal || !proposal.roomId) {
            console.error("Cannot accept match: No proposal/roomId found");
            return;
        }
        console.log('Accepting match (vote):', targetId, proposal.roomId);

        // Use the voting event logic
        socketRef.current.emit('recommendation-action', {
            action: 'accept',
            roomId: proposal.roomId,
            recommendedPeerId: targetId
        });
    }, []);

    const inviteUser = useCallback((targetId: string) => {
        if (!socketRef.current) return;
        console.log('Inviting user:', targetId);
        socketRef.current.emit('invite-user', { target: targetId });
    }, []);

    const acceptInvite = useCallback((senderId: string) => {
        if (!socketRef.current) return;
        console.log('Accepting invite from:', senderId);
        socketRef.current.emit('accept-invite', { senderId });
    }, []);

    const rejectInvite = useCallback(() => {
        // no-op
    }, []);

    const sendMessage = useCallback((targetId: string, text: string) => {
        if (!socketRef.current || !user) {
            console.error('[SignalingContext] Cannot send message: No socket or user');
            return;
        }
        const { chatId } = useCallStore.getState();
        console.log('[SignalingContext] sending message:', { targetId, text, chatId });

        // If we have a chatId, we send it. Otherwise legacy targetId behavior (optional)
        // But for random chat, we rely on chatId primarily now.
        socketRef.current.emit('chat-message', { chatId, text, receiverId: targetId });

        // Optimistic Update
        useCallStore.getState().addMessage({
            senderId: user.id || (user as any)._id,
            senderName: user.displayName || user.username || 'Me',
            text,
            timestamp: Date.now(), // or string
            chatId: chatId || undefined
        });
    }, [user]);

    const getOnlineUsers = useCallback(() => {
        socketRef.current?.emit('get-online-users');
    }, []);

    const [isTyping, setIsTyping] = useState<boolean>(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Typing Event Handlers (New)
    useEffect(() => {
        if (!socketRef.current) return;

        const handleTyping = (data: { senderId: string, isTyping: boolean }) => {
            console.log('[SignalingContext] Typing update:', data);
            // Only show if it's the current chat
            const { chatId, participants } = useCallStore.getState();
            // Assuming 1v1 for now or check senderId
            // Better: active participant check
            if (data.senderId !== user?.id) {
                // We can't easily map senderId to Store UI without a "typingUsers" map.
                // For now, simplify: if any peer types, set global isTyping to true for the UI.
                // Or update store. 
                // But wait, user wanted "other should see typing animation".
                // Let's add `remoteIsTyping` to Store.
                useCallStore.getState().setRemoteIsTyping(data.isTyping);
            }
        };

        socketRef.current.on('typing-update', handleTyping);
        return () => {
            socketRef.current?.off('typing-update', handleTyping);
        };
    }, [user]);

    const sendTyping = useCallback((isTyping: boolean) => {
        if (!socketRef.current) return;
        const { chatId } = useCallStore.getState();
        if (chatId) {
            socketRef.current.emit('typing', { chatId, isTyping });
        }
    }, []);

    const skipMatch = useCallback((targetId?: string) => {
        const { proposal } = useCallStore.getState();
        if (targetId && proposal && proposal.roomId) {
            console.log('Skipping match (vote):', targetId);
            socketRef.current?.emit('recommendation-action', {
                action: 'skip',
                roomId: proposal.roomId,
                recommendedPeerId: targetId
            });
        }
        resetCall();
        getOnlineUsers();
    }, [resetCall, getOnlineUsers]);

    const addRandomUser = useCallback(() => {
        console.log('Requesting to add random user...');
    }, []);

    useEffect(() => {
        if (!user) return;

        // If we already have a socket connected with the SAME userId, don't reconnect
        if (socketRef.current?.connected) {
            const currentQuery = (socketRef.current as any).query;
            // simplistic check, or just force reconnect - skipped for brevity
        }

        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        const userId = user.id || (user as any)._id;

        socketRef.current = io(SOCKET_URL, {
            query: {
                userId: userId,
                displayName: user.displayName,
                username: user.username
            },
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        // Set state to trigger re-render
        setSocket(socketRef.current);

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to signaling server');
        });

        // Matchmaking Events (New Flow)
        socket.on('proposal-received', (data: { type: 'incoming' | 'outgoing', roomId: string, candidate: any, participants?: any[], keyId?: string }) => {
            console.log('Proposal received:', data);

            // Map backend participants to store format
            const mappedParticipants = data.participants ? data.participants : [data.candidate];

            useCallStore.getState().setProposal({
                roomId: data.roomId,
                type: data.type,
                candidate: data.candidate,
                participants: mappedParticipants,
                createdAt: Date.now()
            });

            // Explicitly set Call Sate to proposed to show overlay
            setCallState('proposed');
        });

        socket.on('recommendation-ended', (data: { reason: string, roomId?: string }) => {
            console.log('Recommendation ended:', data);

            if (data.reason === 'accepted') {
                // Transition to 'connected' is handled in room-created mostly, but this confirms voting done.
                // We do NOT set connected here if room-created handles it, but room-created might come first or later.
                // existing logic sets connected here.
                setCallState('connected');
            } else {
                useCallStore.getState().clearProposal();
                setCallState('searching');
            }
        });

        // Room Created handling (Updated)
        socket.on('room-created', (data: { roomId: string, peers: any[], chatId?: string }) => {
            console.log('[Signaling] room-created', data);

            // Set Store Data
            const store = useCallStore.getState();
            store.setCurrentRoomId(data.roomId);
            store.setChatId(data.chatId || null);
            store.setMessages([]);
            store.setIsFriend(false);

            // Add Peers
            data.peers.forEach((user) => {
                const remoteId = user.peerId || user.id;
                if (!remoteId || (socket?.id && socket.id === remoteId)) return;
                addParticipant({
                    peerId: remoteId,
                    userId: user.userId || user.id,
                    displayName: user.displayName,
                    username: user.username,
                    avatarUrl: user.avatarUrl,
                    bio: user.bio,
                    country: user.country,
                });
            });

            setCallState('connected');
        });

        socket.on('friendship-created', (data) => {
            toast.success("You are now friends! Chat unlocked forever.");
            useCallStore.getState().setIsFriend(true);
        });

        socket.on('user-joined', (data) => {
            console.log('User joined:', data);
            addParticipant({
                peerId: data.peerId || data.id,
                userId: data.userId || data.id,
                displayName: data.displayName,
                username: data.username,
                avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.peerId}`,
                bio: data.bio,
                country: data.country,
                language: data.language,
                reputation: data.reputation,
                profession: data.profession,
                interests: data.interests,
                preferences: data.preferences
            });
            // Implicitly connected
            setCallState('connected');
        });

        // Leftover legacy joining just in case, but 'user-joined' is main one now
        socket.on('join-success', (data) => {
            // ...
        });

        // Chat Events
        socket.on('chat-message', (data: { senderId: string, text: string, chatId?: string, timestamp: any }) => {
            console.log('[Signaling] Chat Message', data);

            // Check if it belongs to current chat
            const currentChatId = useCallStore.getState().chatId;
            if (data.chatId && data.chatId !== currentChatId) {
                // Background notification or unread count
                setUnreadCount(prev => prev + 1);
                return;
            }

            useCallStore.getState().addMessage({
                senderId: data.senderId,
                senderName: 'Partner', // We might need to look up name from participants list
                text: data.text,
                timestamp: data.timestamp || Date.now(),
                chatId: data.chatId
            });
        });

        // Call Events
        // Call Events
        socket.on('user-left', ({ socketId }) => {
            console.log('User left:', socketId);
            removeParticipant(socketId);

            // IMPROVEMENT: For random 1v1 chat, if a user leaves, the call is effectively over for the other person.
            // We should immediately reset to IDLE so the auto-match logic can kick in.
            // Check if we are now alone (0 participants left because we removed the one leaving)
            const store = useCallStore.getState();
            if (store.participants.length === 0 && store.callState === 'connected') {
                console.log('Last participant left. Reseting to IDLE to find new match.');
                resetCall();
                setCallState('idle');
                // This will trigger the page.tsx Effect -> set-online -> new match
            }
        });

        socket.on('peer-left', ({ peerId }) => {
            removeParticipant(peerId);
        });

        socket.on('force-disconnect', () => {
            console.log('Received force-disconnect. Resetting call to IDLE (Available).');
            resetCall();
            // Automatically find match? Or just show suggestions?
            // User said: "returned to AVAILABLE immediately... suggestions UI should open"
            // 'idle' state shows recommendations.
            setCallState('idle');

            // Optionally fetch new recommendations immediately
            getOnlineUsers(); // or socket.emit('get-recommendations')
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            setSocket(null);
        };
    }, [(user as any)?._id || user?.id, user?.username, user?.displayName, findMatch, resetCall, setCallState, addParticipant, removeParticipant]);

    // Fetch initial unread count
    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    return (
        <SignalingContext.Provider value={{
            socket: socket,
            findMatch,
            acceptMatch,
            inviteUser,
            acceptInvite,
            rejectInvite,
            sendMessage,
            skipMatch,
            addRandomUser,
            getOnlineUsers,
            unreadCount,
            markAsRead,
            sendTyping
        }}>
            {children}
        </SignalingContext.Provider>
    );
};

export const useSignalingContext = () => {
    const context = useContext(SignalingContext);
    if (!context) {
        throw new Error('useSignalingContext must be used within a SignalingProvider');
    }
    return context;
};

export const useSignaling = useSignalingContext;
