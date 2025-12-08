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
    // Use state to trigger re-renders when socket is created
    const [socket, setSocket] = React.useState<Socket | null>(null);
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
        const store = useCallStore.getState();
        store.setCallState('idle');
        store.setParticipants([]);
        store.clearProposal();
        store.setCurrentRoomId(null);
    }, []);

    const findMatch = useCallback(() => {
        setCallState('searching');
        socketRef.current?.emit('find-match');
    }, [setCallState]);

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
    }, []);

    const rejectInvite = useCallback(() => {
        // no-op
    }, []);

    const sendMessage = useCallback((targetId: string, text: string) => {
        if (!socketRef.current || !user) return;
        socketRef.current.emit('chat-message', { target: targetId, message: text });
    }, [user]);

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

        // If we already have a socket connected with the SAME userId, don't reconnect
        if (socketRef.current?.connected) {
            const currentQuery = (socketRef.current as any).query; // simplistic check, or just force reconnect
            // safer to force reconnect if user changes
            // console.log('Socket already connected');
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

        // Matchmaking Events
        // Matchmaking Events (New Flow)
        socket.on('proposal-received', (data: any) => {
            console.log('Proposal received:', data);

            // Map backend payload to store Proposal type
            // Incoming: { type: 'incoming', user: candidate, roomId }
            // Outgoing: { type: 'outgoing', users: participants, roomId }
            useCallStore.getState().setProposal({
                roomId: data.roomId,
                type: data.type,
                candidate: data.user || data.users?.[0],      // mapped from 'user', fallback to first participant
                participants: data.users,  // mapped from 'users'
                createdAt: Date.now(),
                keyId: data.candidateId // Map explicit key owner
            });

            // If we are "searching", we might want to switch state to "proposed" or "voting"?
            // The UI (MatchOverlay) handles display based on 'proposal' existence or callState.
            // Let's set callState to 'voting' or keep 'searching' but show modal?
            // Page.tsx logic suggests: callState='voting' logic was there?
            // Store has 'proposed' state.
            setCallState('proposed');
        });

        socket.on('recommendation-ended', (data: { reason: string, roomId?: string }) => {
            console.log('Recommendation ended:', data);

            if (data.reason === 'accepted') {
                // Determine peer(s) from proposal to add to participants
                const proposal = useCallStore.getState().proposal;
                const { addParticipant } = useCallStore.getState();

                if (proposal) {
                    if (proposal.candidate) {
                        const candidate = proposal.candidate as any;
                        addParticipant({
                            peerId: candidate.peerId || candidate.id || 'unknown',
                            userId: candidate.userId || candidate.id,
                            displayName: candidate.displayName,
                            username: candidate.username,
                            avatarUrl: candidate.avatarUrl,
                            bio: candidate.bio,
                            country: candidate.country,
                            language: candidate.language,
                            reputation: candidate.reputation,
                            profession: candidate.profession,
                            interests: candidate.interests,
                            preferences: candidate.preferences
                        });
                    }
                    if (proposal.participants && proposal.participants.length > 0) {
                        proposal.participants.forEach(pRaw => {
                            const p = pRaw as any;
                            addParticipant({
                                peerId: p.peerId || p.id || 'unknown',
                                userId: p.userId || p.id,
                                displayName: p.displayName,
                                username: p.username,
                                avatarUrl: p.avatarUrl,
                                bio: p.bio,
                                country: p.country,
                                language: p.language,
                                reputation: p.reputation,
                                profession: p.profession,
                                interests: p.interests,
                                preferences: p.preferences
                            });
                        });
                    }
                }

                // Transition to 'connected' (implicitly starting video setup via useWebRTC)
                // Note: We do NOT clear proposal here immediately, so useWebRTC can read it if needed.
                // It will be cleared later or by resetCall.
                setCallState('connected');
            } else {
                useCallStore.getState().clearProposal();
                setCallState('searching');
            }
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
        socket.on('chat-message', ({ senderId, text, senderName }) => {
            // Unread logic
            setUnreadCount(prev => prev + 1);
        });

        // Call Events
        socket.on('peer-left', ({ peerId }) => {
            removeParticipant(peerId);
        });

        socket.on('force-disconnect', () => {
            console.log('Received force-disconnect. Resetting call and searching...');
            resetCall();
            setTimeout(() => {
                findMatch();
            }, 1000);
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

export const useSignaling = useSignalingContext;
