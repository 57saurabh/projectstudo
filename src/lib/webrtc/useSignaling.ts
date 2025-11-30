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
        addMessage,
        setInQueue,
        setInCall,
        resetCall
    } = useCallStore();

    useEffect(() => {
        if (!user) return;

        socketRef.current = io(SOCKET_URL, {
            query: { userId: user.id, displayName: user.displayName }
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to signaling server');
        });

        // Matchmaking Events
        socket.on('match-found', ({ peerId, roomId, initiator }) => {
            console.log('Match found:', peerId);
            setRoomId(roomId);
            setInQueue(false);
            setInCall(true);
            addParticipant({
                id: peerId,
                displayName: 'Stranger',
                isMuted: false,
                isVideoOff: false
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
            // If 1-on-1, maybe end call?
        });

        socket.on('force-disconnect', () => {
            console.log('Received force-disconnect. Resetting call and searching...');
            resetCall();
            // Optional: Add a small delay or UI feedback before searching again
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
        socketRef.current?.emit('find-match');
    }, []);

    const sendMessage = useCallback((targetId: string, text: string) => {
        if (!socketRef.current || !user) return;

        socketRef.current.emit('chat-message', { target: targetId, message: text });
        addMessage({
            senderId: user.id,
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
        // Placeholder for multi-user logic
        // socketRef.current?.emit('add-random-user');
        console.log('Requesting to add random user...');
    }, []);

    const getOnlineUsers = useCallback(() => {
        socketRef.current?.emit('get-online-users');
    }, []);

    return {
        socket: socketRef.current,
        findMatch,
        sendMessage,
        skipMatch,
        addRandomUser,
        getOnlineUsers
    };
};
