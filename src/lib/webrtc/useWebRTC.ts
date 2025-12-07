// useWebRTC.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSignalingContext } from './SignalingContext'; // adjust path if needed
import { useCallStore } from '../store/useCallStore';
import { toast } from 'sonner';

type PCMap = Record<string, RTCPeerConnection>;
type StreamMap = Record<string, MediaStream>;

const ICE_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
        // add TURN servers here for production
    ]
};

const MAX_PARTICIPANTS = 9;

export function useWebRTC() {
    const { socket } = useSignalingContext(); // get socket from your SignalingContext
    const {
        addParticipant,
        removeParticipant,
        updateParticipant,
        setCallState,
        setInCall,
        setInQueue,
        resetCall,
        addMessage,
        setPendingInvite,
        setIsInitiator
    } = useCallStore();

    // Local media
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMicOn, setMicOn] = useState(true);
    const [isCamOn, setCamOn] = useState(true);
    const [isScreenSharing, setScreenSharing] = useState(false);

    // PeerConnections and tracks
    const pcs = useRef<PCMap>({});
    const remoteStreams = useRef<StreamMap>({});
    const pendingCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});

    // Negotiation guards
    const creatingOffer = useRef<Record<string, boolean>>({});
    const hasLocalDescription = useRef<Record<string, boolean>>({});

    // helpers
    const ensureLocalStream = useCallback(async () => {
        if (localStream) return localStream;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.error('Failed to get local media', err);
            toast.error('Failed to access camera/microphone');
            throw err;
        }
    }, [localStream]);

    // Create or return existing peer connection for a peerId
    const createPeerConnection = useCallback((peerId: string) => {
        if (pcs.current[peerId]) return pcs.current[peerId];

        const pc = new RTCPeerConnection(ICE_CONFIG);

        // track remote streams
        pc.ontrack = (ev) => {
            // prefer first incoming stream
            const stream = ev.streams && ev.streams[0];
            if (stream) {
                remoteStreams.current[peerId] = stream;
                addParticipant({
                    id: peerId,
                    userId: undefined,
                    displayName: `User-${peerId.slice(0, 6)}`,
                    isMuted: false,
                    isVideoOff: false,
                    reputation: 100,
                    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${peerId}`,
                    shouldOffer: false
                });
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                // Only send candidate if peer is in same room — server is expected to filter, but do best-effort check
                socket.emit('ice-candidate', { target: peerId, candidate: event.candidate });
            }
        };

        pc.onconnectionstatechange = () => {
            const s = pc.connectionState;
            console.log(`PC ${peerId} connectionState:`, s);
            if (s === 'failed' || s === 'disconnected' || s === 'closed') {
                // cleanup
                removePeer(peerId);
            }
        };

        pcs.current[peerId] = pc;
        pendingCandidates.current[peerId] = [];
        creatingOffer.current[peerId] = false;
        hasLocalDescription.current[peerId] = false;

        return pc;
    }, [socket, addParticipant]);

    // Cleanup a peer
    const removePeer = useCallback((peerId: string) => {
        try {
            const pc = pcs.current[peerId];
            if (pc) {
                pc.close();
                delete pcs.current[peerId];
            }
            delete pendingCandidates.current[peerId];
            delete remoteStreams.current[peerId];
            delete creatingOffer.current[peerId];
            delete hasLocalDescription.current[peerId];

            removeParticipant(peerId);
        } catch (e) {
            console.warn('Error while removing peer', peerId, e);
        }
    }, [removeParticipant]);

    // Flush buffered ICE candidates after remote description is set
    const flushPendingCandidates = useCallback(async (peerId: string) => {
        const pc = pcs.current[peerId];
        if (!pc) return;
        const list = pendingCandidates.current[peerId] || [];
        if (list.length === 0) return;
        try {
            for (const c of list) {
                await pc.addIceCandidate(c);
            }
        } catch (err) {
            console.error('Failed to add buffered ICE candidates', err);
        } finally {
            pendingCandidates.current[peerId] = [];
        }
    }, []);

    // Initiator creates offer (only call when shouldOffer = true)
    const createAndSendOffer = useCallback(async (peerId: string) => {
        if (!socket) return;
        if (creatingOffer.current[peerId]) return; // avoid duplicate offers
        creatingOffer.current[peerId] = true;

        try {
            const pc = createPeerConnection(peerId);
            const stream = await ensureLocalStream();

            // add local tracks if not added
            const senders = pc.getSenders().map(s => s.track).filter(Boolean);
            if (stream && senders.length === 0) {
                stream.getTracks().forEach(track => pc.addTrack(track, stream));
            }

            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);
            hasLocalDescription.current[peerId] = true;

            socket.emit('offer', { target: peerId, sdp: pc.localDescription });
        } catch (err) {
            console.error('Failed to create/send offer', err);
        } finally {
            creatingOffer.current[peerId] = false;
        }
    }, [socket, createPeerConnection, ensureLocalStream]);

    // Handle incoming offer
    const handleOffer = useCallback(async (sender: string, sdp: RTCSessionDescriptionInit) => {
        try {
            const pc = createPeerConnection(sender);
            const stream = await ensureLocalStream();

            // add local tracks if not already
            const senders = pc.getSenders().map(s => s.track).filter(Boolean);
            if (stream && senders.length === 0) {
                stream.getTracks().forEach(track => pc.addTrack(track, stream));
            }

            // Apply remote offer
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));

            // create answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            hasLocalDescription.current[sender] = true;

            // send answer
            socket?.emit('answer', { target: sender, sdp: pc.localDescription });

            // flush any buffered ICE for this peer
            await flushPendingCandidates(sender);
        } catch (err) {
            console.error('Error handling offer from', sender, err);
        }
    }, [createPeerConnection, ensureLocalStream, socket, flushPendingCandidates]);

    // Handle incoming answer
    const handleAnswer = useCallback(async (sender: string, sdp: RTCSessionDescriptionInit) => {
        try {
            const pc = pcs.current[sender];
            if (!pc) {
                console.warn('Received answer for unknown pc', sender);
                return;
            }

            // Only set remote answer if we have local offer
            const allowed = pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-local-pranswer';
            if (!allowed) {
                console.warn('Received answer in wrong state', pc.signalingState, 'for', sender);
                return;
            }

            await pc.setRemoteDescription(new RTCSessionDescription(sdp));

            // flush buffered
            await flushPendingCandidates(sender);
        } catch (err) {
            console.error('Error handling answer from', sender, err);
        }
    }, [flushPendingCandidates]);

    // Handle incoming ICE candidate (remote)
    const handleRemoteIce = useCallback(async (sender: string, candidate: RTCIceCandidateInit) => {
        const pc = pcs.current[sender];
        if (!pc) {
            // buffer until pc created
            pendingCandidates.current[sender] = pendingCandidates.current[sender] || [];
            pendingCandidates.current[sender].push(candidate);
            return;
        }

        try {
            // if remoteDescription not set yet, buffer
            if (!pc.remoteDescription || pc.remoteDescription.type === '') {
                pendingCandidates.current[sender] = pendingCandidates.current[sender] || [];
                pendingCandidates.current[sender].push(candidate);
            } else {
                await pc.addIceCandidate(candidate);
            }
        } catch (err) {
            console.error('Error adding remote ICE candidate', err);
        }
    }, []);

    // Toggle mic / cam / screen share
    const toggleMic = useCallback(() => {
        if (!localStream) return;
        localStream.getAudioTracks().forEach(t => (t.enabled = !t.enabled));
        setMicOn(prev => !prev);
    }, [localStream]);

    const toggleCam = useCallback(() => {
        if (!localStream) return;
        localStream.getVideoTracks().forEach(t => (t.enabled = !t.enabled));
        setCamOn(prev => !prev);
    }, [localStream]);

    const toggleScreenShare = useCallback(async () => {
        if (isScreenSharing) {
            // stop screen and re-add camera
            if (!localStream) {
                setScreenSharing(false);
                return;
            }
            // re-acquire camera track and replace on senders
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];
            // replace for each pc
            Object.values(pcs.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) sender.replaceTrack(cameraTrack);
            });
            setScreenSharing(false);
            // replace in localStream
            localStream.getVideoTracks().forEach(t => t.stop());
            localStream.addTrack(cameraTrack);
            setLocalStream(localStream);
            return;
        }

        try {
            const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];

            // replace on each pc
            Object.values(pcs.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) sender.replaceTrack(screenTrack);
            });

            // update local stream (stop previous video)
            localStream?.getVideoTracks().forEach(t => t.stop());
            const newLocal = localStream || new MediaStream();
            newLocal.addTrack(screenTrack);
            setLocalStream(newLocal);
            setScreenSharing(true);

            // when screen sharing stops, revert
            screenTrack.onended = () => {
                setScreenSharing(false);
                toggleScreenShare(); // attempt to revert
            };
        } catch (err) {
            console.warn('Screen share failed', err);
        }
    }, [isScreenSharing, localStream]);

    // Public API methods that emit to socket
    const findMatch = useCallback(() => {
        setInQueue(true);
        setCallState('searching');
        socket?.emit('find-match');
    }, [socket, setInQueue, setCallState]);

    const sendMessage = useCallback((targetId: string, text: string) => {
        if (!socket) return;
        socket.emit('chat-message', { target: targetId, message: text });
        addMessage({ senderId: 'me', senderName: 'Me', text, timestamp: Date.now() });
    }, [socket, addMessage]);

    const skipMatch = useCallback((targetId?: string) => {
        if (!socket) return;
        if (targetId) socket.emit('skip-match', { target: targetId });
        resetCall();
        findMatch();
    }, [socket, resetCall, findMatch]);

    const addRandomUser = useCallback(() => {
        if (!socket) return;
        socket.emit('add-user');
        toast.info('Searching for another user to add...');
    }, [socket]);

    const inviteUser = useCallback((targetId: string) => {
        if (!socket) return;
        socket.emit('invite-user', { target: targetId });
    }, [socket]);

    const acceptInvite = useCallback((senderId: string) => {
        if (!socket) return;
        socket.emit('accept-invite', { senderId });
        setPendingInvite(null);
    }, [socket, setPendingInvite]);

    const rejectInvite = useCallback(() => {
        setPendingInvite(null);
    }, [setPendingInvite]);

    const acceptMatch = useCallback((targetId: string) => {
        if (!socket) return;
        socket.emit('accept-match', { target: targetId });
    }, [socket]);

    // Abort and cleanup the entire call (leave room)
    const abortCall = useCallback(() => {
        // Close all PCs and clear
        Object.keys(pcs.current).forEach(pid => {
            try {
                pcs.current[pid]?.close();
            } catch (e) { }
            delete pcs.current[pid];
        });
        pendingCandidates.current = {};
        remoteStreams.current = {};
        setInCall(false);
        setCallState('idle');
        resetCall();
        // Inform server to leave room / abort
        socket?.emit('abort-call');
    }, [socket, resetCall, setInCall, setCallState]);

    // Wire up socket event listeners
    useEffect(() => {
        if (!socket) return;

        // Offer
        socket.on('offer', async (payload: { sender: string, sdp: RTCSessionDescriptionInit }) => {
            const { sender, sdp } = payload;
            console.log('socket.on(offer) from', sender);
            await handleOffer(sender, sdp);
        });

        // Answer
        socket.on('answer', async (payload: { sender: string, sdp: RTCSessionDescriptionInit }) => {
            const { sender, sdp } = payload;
            console.log('socket.on(answer) from', sender);
            await handleAnswer(sender, sdp);
        });

        // Remote ICE
        socket.on('ice-candidate', async (payload: { sender: string, candidate: RTCIceCandidateInit }) => {
            const { sender, candidate } = payload;
            await handleRemoteIce(sender, candidate);
        });

        // user-joined: server tells us a peer exists in the room now => create PC and (if shouldOffer) start offer
        socket.on('user-joined', async (data: any) => {
            const peerId = data.peerId || data.id || data.peerId;
            console.log('socket.on(user-joined)', peerId, data);

            // Create pc but don't start negotiation until we know shouldOffer
            const pc = createPeerConnection(peerId);

            // If server included shouldOffer flag, use it; otherwise, default heuristics:
            const shouldOffer = data.shouldOffer ?? true;

            // If we should offer, kick off offer flow (but guard double-offer)
            if (shouldOffer) {
                // Wait a tiny tick to ensure pc is ready and local tracks added
                setTimeout(() => {
                    createAndSendOffer(peerId);
                }, 50);
            }
        });

        // join-success: when we join an existing room, receive peers list
        socket.on('join-success', async (data: any) => {
            console.log('socket.on(join-success)', data);
            setCallState('connected');
            setInCall(true);

            // Add peers to local store (they will eventually fire user-joined too or we initiate connections)
            if (Array.isArray(data.peers)) {
                for (const p of data.peers) {
                    addParticipant({
                        id: p.id,
                        userId: undefined,
                        displayName: p.displayName,
                        isMuted: false,
                        isVideoOff: false,
                        reputation: p.reputation,
                        avatarUrl: p.avatarUrl,
                        shouldOffer: p.shouldOffer ?? true
                    });

                    // If server didn't emit user-joined, proactively create PC and offer if needed
                    if (p.shouldOffer ?? true) {
                        // small delay to avoid simultaneous offers causing glare
                        setTimeout(() => createAndSendOffer(p.id), 80);
                    }
                }
            }
        });

        // recommendation events (UI-level) - pass through to UI store or toast
        socket.on('recommendation-received', (payload: any) => {
            console.log('recommendation-received', payload);
            // UI handles these; we don't start negotiation until accepted by everyone
        });

        socket.on('recommendation-ended', (payload: any) => {
            console.log('recommendation-ended', payload);
        });

        socket.on('call-ended', (payload: any) => {
            console.log('call-ended', payload);
            abortCall();
        });

        socket.on('peer-left', (payload: { peerId: string }) => {
            console.log('peer-left', payload);
            removePeer(payload.peerId);
        });

        // Clean up on unmount
        return () => {
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');
            socket.off('user-joined');
            socket.off('join-success');
            socket.off('recommendation-received');
            socket.off('recommendation-ended');
            socket.off('call-ended');
            socket.off('peer-left');
        };
    }, [
        socket,
        handleOffer,
        handleAnswer,
        handleRemoteIce,
        createPeerConnection,
        createAndSendOffer,
        abortCall,
        removePeer,
        addParticipant,
        setCallState,
        setInCall
    ]);

    // when localStream changes, replace tracks for existing PCS
    useEffect(() => {
        if (!localStream) return;
        Object.values(pcs.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            const localTrack = localStream.getVideoTracks()[0];
            if (sender && localTrack) sender.replaceTrack(localTrack);
            else if (localTrack) pc.addTrack(localTrack, localStream);
            const audioSender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioSender && audioTrack) audioSender.replaceTrack(audioTrack);
            else if (audioTrack) pc.addTrack(audioTrack, localStream);
        });
    }, [localStream]);

    // cleanup full state on unmount
    useEffect(() => {
        return () => {
            Object.keys(pcs.current).forEach(pid => {
                try { pcs.current[pid].close(); } catch { }
                delete pcs.current[pid];
            });
            pendingCandidates.current = {};
            remoteStreams.current = {};
        };
    }, []);

    return {
        // state
        localStream,
        isMicOn,
        isCamOn,
        isScreenSharing,
        remoteStreams: remoteStreams.current,
        // methods
        findMatch,
        acceptMatch,
        sendMessage,
        skipMatch,
        addRandomUser,
        inviteUser,
        acceptInvite,
        rejectInvite,
        abortCall,
        toggleMic,
        toggleCam,
        toggleScreenShare,
        socket
    };
}

export default useWebRTC;
