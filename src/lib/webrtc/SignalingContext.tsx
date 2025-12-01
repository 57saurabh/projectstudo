'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCallStore } from '../store/useCallStore';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import axios from 'axios';

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
}

const SignalingContext = createContext<SignalingContextType | null>(null);

export const SignalingProvider = ({ children }: { children: React.ReactNode }) => {
    const socketRef = useRef<Socket | null>(null);
    const { user, token } = useSelector((state: RootState) => state.auth);
    const {
        setRoomId,
        addParticipant,
        removeParticipant,
        updateParticipant,
        addMessage,
        setInQueue,
        setInCall,
        setCallState,
        setIsInitiator,
        resetCall,
        setPendingInvite
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
        // Refresh count after a short delay to allow DB update
        setTimeout(fetchUnreadCount, 500);
    }, [fetchUnreadCount]);

    const findMatch = useCallback(() => {
        setInQueue(true);
        setCallState('searching');
        socketRef.current?.emit('find-match');
    }, [setInQueue, setCallState]);

    const acceptMatch = useCallback((targetId: string) => {
        if (!socketRef.current) return;
        console.log('Accepting match with:', targetId);
        socketRef.current.emit('accept-match', { target: targetId });
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
        setPendingInvite(null);
    }, [setPendingInvite]);

    const rejectInvite = useCallback(() => {
        setPendingInvite(null);
    }, [setPendingInvite]);

    const sendMessage = useCallback((targetId: string, text: string) => {
        if (!socketRef.current || !user) return;

        socketRef.current.emit('chat-message', { target: targetId, message: text });
        addMessage({
            senderId: user._id,
            senderName: user.displayName || 'Me',
            text,
            timestamp: Date.now()
        });
    }, [user, addMessage]);

    const skipMatch = useCallback((targetId?: string) => {
        if (targetId) {
            socketRef.current?.emit('skip-match', { target: targetId });
        }
        resetCall();
        findMatch();
    }, [findMatch, resetCall]);

    const addRandomUser = useCallback(() => {
        console.log('Requesting to add random user...');
    }, []);

    const getOnlineUsers = useCallback(() => {
        socketRef.current?.emit('get-online-users');
    }, []);

    useEffect(() => {
        if (!user) return;

        // If socket already exists and is connected with same user, skip
        if (socketRef.current?.connected) {
            // We might want to check if the user ID matches, but for now assume if user changes, this effect re-runs
        }

        // Initialize Socket
        socketRef.current = io(SOCKET_URL, {
            query: {
                userId: user._id,
                displayName: user.displayName,
                username: user.username
            },
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to signaling server');
        });

        // Matchmaking Events
        socket.on('match-proposed', ({ peerId, peerUserId, initiator, reputation, avatarUrl, username, bio, country, language }) => {
            console.log('Match proposed:', peerId);
            setCallState('proposed');
            setInQueue(false);

            addParticipant({
                id: peerId,
                userId: peerUserId,
                displayName: username || 'Stranger',
                isMuted: false,
                isVideoOff: false,
                reputation,
                avatarUrl,
                shouldOffer: false,
                bio,
                country,
                language
            });
        });

        socket.on('start-call', ({ peerId, shouldOffer }) => {
            console.log('Starting call with:', peerId, 'Should offer:', shouldOffer);
            setCallState('connecting');
            setInCall(true);
            setIsInitiator(shouldOffer);
            updateParticipant(peerId, { shouldOffer });
        });

        socket.on('match-cancelled', () => {
            console.log('Match cancelled by peer');
            resetCall(true);
            findMatch();
        });

        // Invite Events
        socket.on('invite-received', (data) => {
            console.log('Invite received:', data);
            setPendingInvite(data);
        });

        socket.on('user-joined', (data) => {
            console.log('User joined:', data);
            addParticipant({
                id: data.peerId,
                displayName: data.displayName,
                isMuted: false,
                isVideoOff: false,
                reputation: data.reputation,
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.peerId}`,
                shouldOffer: false
            });
            addMessage({
                senderId: 'system',
                senderName: 'System',
                text: `${data.displayName} joined the call.`,
                timestamp: Date.now(),
                isSystem: true
            });
        });

        socket.on('join-success', (data) => {
            console.log('Joined call successfully:', data);
            setCallState('connected');
            setInCall(true);

            data.peers.forEach((peer: any) => {
                addParticipant({
                    id: peer.id,
                    displayName: peer.displayName,
                    isMuted: false,
                    isVideoOff: false,
                    reputation: peer.reputation,
                    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${peer.id}`,
                    shouldOffer: true
                });
            });
        });

        // Chat Events
        socket.on('chat-message', ({ senderId, text, senderName }) => {
            addMessage({
                senderId,
                senderName,
                text,
                timestamp: Date.now()
            });

            // Increment unread count if we are not in the messages page or chatting with this user
            setUnreadCount(prev => prev + 1);
        });

        // Call Events
        socket.on('peer-left', ({ peerId }) => {
            removeParticipant(peerId);
            addMessage({
                senderId: 'system',
                senderName: 'System',
                text: 'Peer has left the chat.',
                timestamp: Date.now(),
                isSystem: true
            });
        });

        socket.on('force-disconnect', () => {
            console.log('Received force-disconnect. Resetting call and searching...');
            resetCall(true);
            setTimeout(() => {
                findMatch();
            }, 1000);
        });

        return () => {
            socket.disconnect();
        };
    }, [user, findMatch, resetCall, setCallState, setInQueue, addParticipant, setInCall, setIsInitiator, updateParticipant, setPendingInvite, addMessage]);

    // Fetch initial unread count
    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    return (
        <SignalingContext.Provider value={{
            socket: socketRef.current,
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
            markAsRead
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
