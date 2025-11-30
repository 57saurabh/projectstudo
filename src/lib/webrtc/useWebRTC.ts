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
    const { socket, findMatch, sendMessage, skipMatch, addRandomUser, acceptMatch: signalAcceptMatch } = useSignaling();
    const {
        localStream,
        setLocalStream,
        setMediaError,
        addRemoteStream,
        removeRemoteStream,
        callState,
        isInitiator,
        participants,
        updateParticipant
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
            // Cleanup logic handled by CameraGuard or manual reset
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
            console.log('Received remote track from:', peerId, event.streams[0]);
            const [remoteStream] = event.streams;
            if (remoteStream) {
                addRemoteStream(peerId, remoteStream);
            }
        };

        return pc;
    }, [localStream, socket]);

    // Handle Signaling Events for WebRTC
    useEffect(() => {
        if (!socket) return;

        socket.on('offer', async (data) => {
            const { sender, sdp } = data;
            if (!sender) return;
            console.log('Received offer from:', sender);
            const pc = createPeerConnection(sender);
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('answer', { target: sender, sdp: answer });
        });

        socket.on('answer', async (data) => {
            const { sender, sdp } = data;
            if (!sender) return;
            console.log('Received answer from:', sender);
            const pc = createPeerConnection(sender);
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        socket.on('ice-candidate', async (data) => {
            const { sender, candidate } = data;
            if (!sender) return;
            // console.log('Received ICE candidate from:', sender);
            const pc = createPeerConnection(sender);
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        });

        // Handle Media State Change
        socket.on('media-state-change', ({ sender, isMuted, isVideoOff }) => {
            updateParticipant(sender, { isMuted, isVideoOff });
        });

        return () => {
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');
            socket.off('media-state-change');
        };
    }, [socket, createPeerConnection, updateParticipant]);

    // React to Call State Changes (Start Call)
    useEffect(() => {
        if (callState === 'connecting' && isInitiator) {
            const peer = participants[0]; // Assuming 1-on-1 for now
            if (peer) {
                console.log('Initiating call to:', peer.id);
                const pc = createPeerConnection(peer.id);
                pc.createOffer().then(offer => {
                    pc.setLocalDescription(offer);
                    socket?.emit('offer', { target: peer.id, sdp: offer });
                });
            }
        }
    }, [callState, isInitiator, participants, createPeerConnection, socket]);

    const acceptMatch = useCallback(async () => {
        const peer = participants[0];
        if (peer) {
            signalAcceptMatch(peer.id);
        }
    }, [participants, signalAcceptMatch]);

    const handleSkipMatch = useCallback((peerId?: string) => {
        // Stop all peer connections
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};

        skipMatch(peerId);
    }, [skipMatch]);

    const toggleMic = useCallback(() => {
        const { toggleMute, isMuted, participants } = useCallStore.getState();
        toggleMute();

        // Emit new state to all peers
        const newMutedState = !isMuted; // Toggle flips it
        participants.forEach(p => {
            socket?.emit('media-state-change', {
                target: p.id,
                isMuted: newMutedState,
                isVideoOff: undefined // Don't change video state
            });
        });
    }, [socket]);

    const toggleCam = useCallback(() => {
        const { toggleVideo, isVideoOff, participants } = useCallStore.getState();
        toggleVideo();

        // Emit new state to all peers
        const newVideoState = !isVideoOff; // Toggle flips it
        participants.forEach(p => {
            socket?.emit('media-state-change', {
                target: p.id,
                isMuted: undefined, // Don't change audio state
                isVideoOff: newVideoState
            });
        });
    }, [socket]);

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

    return {
        socket,
        localStream,
        findMatch,
        sendMessage,
        skipMatch: handleSkipMatch,
        toggleScreenShare,
        addRandomUser,
        acceptMatch,
        toggleMic,
        toggleCam
    };
};
