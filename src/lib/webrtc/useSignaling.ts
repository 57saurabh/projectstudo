import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCallStore } from '../store/useCallStore';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export const useSignaling = () => {
    const socketRef = useRef<Socket | null>(null);
    const { user } = useSelector((state: RootState) => state.auth);
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

    useEffect(() => {
        if (!user) return;

        socketRef.current = io(SOCKET_URL, {
            query: {
                userId: user._id,
                displayName: user.displayName,
                username: user.username
            }
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to signaling server');
        });

        // Matchmaking Events
        socket.on('match-proposed', ({ peerId, initiator, reputation, avatarUrl, username, bio, country, language }) => {
            console.log('Match proposed:', peerId);
            setCallState('proposed');
            setInQueue(false);

            // Add participant as placeholder (waiting for accept)
            addParticipant({
                id: peerId,
                displayName: username || 'Stranger', // Show username initially
                isMuted: false,
                isVideoOff: false,
                reputation,
                avatarUrl,
                shouldOffer: false, // Wait for start-call
                bio,
                country,
                language
            });
        });

        socket.on('start-call', ({ peerId, shouldOffer }) => {
            console.log('Starting call with:', peerId, 'Should offer:', shouldOffer);
            setCallState('connecting');
            setInCall(true);
            setIsInitiator(shouldOffer); // Keep for legacy/single peer logic if needed, but rely on participant.shouldOffer
            updateParticipant(peerId, { shouldOffer });
        });

        socket.on('match-cancelled', () => {
            console.log('Match cancelled by peer');
            resetCall();
            // Auto-search again?
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
                shouldOffer: false // Existing users wait for offer
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
                    shouldOffer: true // Newcomer initiates to everyone
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
            resetCall();
            setTimeout(() => {
                findMatch();
            }, 1000);
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    const findMatch = useCallback(() => {
        setInQueue(true);
        setCallState('searching');
        socketRef.current?.emit('find-match');
    }, []);

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
    }, []);

    const rejectInvite = useCallback(() => {
        setPendingInvite(null);
    }, []);

    const sendMessage = useCallback((targetId: string, text: string) => {
        if (!socketRef.current || !user) return;

        socketRef.current.emit('chat-message', { target: targetId, message: text });
        addMessage({
            senderId: user._id,
            senderName: user.displayName || 'Me',
            text,
            timestamp: Date.now()
        });
    }, [user]);

    const skipMatch = useCallback((targetId?: string) => {
        if (targetId) {
            socketRef.current?.emit('skip-match', { target: targetId });
        }
        resetCall();
        findMatch(); // Auto-search
    }, [findMatch]);

    const addRandomUser = useCallback(() => {
        console.log('Requesting to add random user...');
        // Logic to pick a random online user and invite them?
        // For now, let's just assume we have a UI to pick a user.
    }, []);

    const getOnlineUsers = useCallback(() => {
        socketRef.current?.emit('get-online-users');
    }, []);

    return {
        socket: socketRef.current,
        findMatch,
        acceptMatch,
        inviteUser,
        acceptInvite,
        rejectInvite,
        sendMessage,
        skipMatch,
        addRandomUser,
        getOnlineUsers
    };
};
