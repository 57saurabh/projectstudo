import { useEffect, useRef, useCallback, useState } from 'react';
import { useCallStore } from '../store/useCallStore';
import { useSignaling } from './useSignaling';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

export const useWebRTC = () => {
    const { socket, findMatch, sendMessage, skipMatch, addRandomUser } = useSignaling();
    const {
        localStream,
        setLocalStream,
        setMediaError,
        addRemoteStream,
        removeRemoteStream
    } = useCallStore();

    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

    const streamRef = useRef<MediaStream | null>(null);

    // Initialize Local Stream
    useEffect(() => {
        const initStream = async () => {
            // Check if we already have an active stream
            if (localStream && localStream.active && localStream.getTracks().some(t => t.readyState === 'live')) {
                streamRef.current = localStream;
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                setLocalStream(stream);
                streamRef.current = stream;
                setMediaError(null);
            } catch (err: any) {
                console.error('Error accessing media devices:', err);
                if (err.name === 'NotAllowedError') {
                    setMediaError('Permission denied. Please allow camera and microphone access.');
                } else if (err.name === 'NotFoundError') {
                    setMediaError('No camera or microphone found.');
                } else {
                    setMediaError('Failed to access camera/microphone. Ensure you are using HTTPS or localhost.');
                }
            }
        };

        initStream();

        return () => {
            // Cleanup stream on unmount using the ref to avoid stale closures
            // MOVED TO CameraGuard: We now persist the stream across call pages for better UX.
            // The CameraGuard component ensures tracks are stopped when leaving /call/* routes.
            /*
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                setLocalStream(null);
            }
            */
        };
    }, []);

    const createPeerConnection = useCallback((peerId: string) => {
        if (peerConnections.current[peerId]) return peerConnections.current[peerId];

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[peerId] = pc;

        // Add local tracks
        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('ice-candidate', { target: peerId, candidate: event.candidate });
            }
        };

        // Handle Remote Stream
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            if (remoteStream) {
                addRemoteStream(peerId, remoteStream);
            }
        };

        return pc;
    }, [localStream, socket]);

    const [pendingMatch, setPendingMatch] = useState<{ peerId: string; initiator: boolean; reputation?: number; avatarUrl?: string } | null>(null);

    // ... (existing code)

    // Handle Signaling Events for WebRTC
    useEffect(() => {
        if (!socket) return;

        // ... (existing handlers)

        // Initiator logic (e.g., when match found)
        socket.on('match-found', async ({ peerId, initiator, reputation, avatarUrl }) => {
            // Instead of connecting immediately, set pending match
            setPendingMatch({ peerId, initiator, reputation, avatarUrl });
        });

        return () => {
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');
            socket.off('match-found');
        };
    }, [socket, createPeerConnection]);

    const acceptMatch = useCallback(async () => {
        if (!pendingMatch || !socket) return;

        const { peerId, initiator } = pendingMatch;

        if (initiator) {
            const pc = createPeerConnection(peerId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer', { target: peerId, sdp: offer });
        }

        // Clear pending match as we are now connecting
        setPendingMatch(null);
    }, [pendingMatch, socket, createPeerConnection]);

    const handleSkipMatch = useCallback((peerId?: string) => {
        setPendingMatch(null); // Clear pending match if skipping
        skipMatch(peerId);
    }, [skipMatch]);

    const toggleScreenShare = useCallback(async () => {
        try {
            const { isScreenSharing, setIsScreenSharing } = useCallStore.getState();

            if (isScreenSharing) {
                // Stop Screen Share -> Switch back to Camera
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                const videoTrack = stream.getVideoTracks()[0];

                if (localStream) {
                    const oldTrack = localStream.getVideoTracks()[0];
                    if (oldTrack) {
                        oldTrack.stop();
                        localStream.removeTrack(oldTrack);
                        localStream.addTrack(videoTrack);
                    }
                }

                // Replace track in all peer connections
                Object.values(peerConnections.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });

                setIsScreenSharing(false);
            } else {
                // Start Screen Share
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = stream.getVideoTracks()[0];

                if (localStream) {
                    const oldTrack = localStream.getVideoTracks()[0];
                    if (oldTrack) {
                        oldTrack.stop();
                        localStream.removeTrack(oldTrack);
                        localStream.addTrack(screenTrack);
                    }
                }

                // Replace track in all peer connections
                Object.values(peerConnections.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    }
                });

                // Handle system "Stop Sharing" button
                screenTrack.onended = () => {
                    toggleScreenShare(); // Revert to camera
                };

                setIsScreenSharing(true);
            }
        } catch (err) {
            console.error('Error toggling screen share:', err);
        }
    }, [localStream]);

    // ... (existing code)

    return {
        socket,
        localStream,
        findMatch,
        sendMessage,
        skipMatch: handleSkipMatch, // Use wrapped skipMatch
        toggleScreenShare,
        addRandomUser,
        pendingMatch, // Expose pending match
        acceptMatch   // Expose accept function
    };
};
