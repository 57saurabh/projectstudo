// src/lib/webrtc/useWebRTC.ts
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSignaling } from './SignalingContext';
import { useCallStore } from '@/lib/store/useCallStore';
import { toast } from 'sonner';

type PeerMap = Record<string, RTCPeerConnection>;

const PC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
};

export function useWebRTC(localVideoRef: React.RefObject<HTMLVideoElement | null>) {
  const { socket } = useSignaling();
  const setLocalStream = useCallStore((s) => s.setLocalStream);
  const addParticipant = useCallStore((s) => s.addParticipant);
  const removeParticipant = useCallStore((s) => s.removeParticipant);
  const setCallState = useCallStore((s) => s.setCallState);

  // New Store Actions
  const setLocalScreenStream = useCallStore((s) => s.setLocalScreenStream);
  const setRemoteScreenShare = useCallStore((s) => s.setRemoteScreenShare);

  const pcs = useRef<PeerMap>({});
  const makingOfferMap = useRef<Record<string, boolean>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);

  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // getUserMedia once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) return;
        localStreamRef.current = stream;
        setLocalStream(stream);

        // CRITICAL FIX: If peers already exist (race condition), add tracks now.
        Object.values(pcs.current).forEach(pc => {
          stream.getTracks().forEach(track => {
            const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
            if (!sender) {
              pc.addTrack(track, stream);
            }
          });
        });

        if (localVideoRef.current) {
          try {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
            await localVideoRef.current.play().catch(() => { });
          } catch (e) { }
        }
      } catch (err) {
        console.error('[useWebRTC] getUserMedia failed', err);
      }
    })();

    return () => {
      mounted = false;
      stopMediaRefs();
      // close all peers
      Object.values(pcs.current).forEach((pc) => {
        try { pc.close(); } catch (e) { }
      });
      pcs.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopMediaRefs = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  // ICE Candidate Queue: { peerId: RTCIceCandidate[] }
  const iceCandidatesQueue = useRef<Record<string, RTCIceCandidate[]>>({});

  function createPeer(remoteId: string) {
    if (pcs.current[remoteId]) return pcs.current[remoteId];

    const pc = new RTCPeerConnection(PC_CONFIG);
    console.log('[useWebRTC] createPeer', remoteId);

    // 1. Attach Camera Tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
    }

    // 2. Attach Screen Tracks
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localScreenStreamRef.current!));
    }

    pc.ontrack = (ev) => {
      const incomingStream = ev.streams[0];
      if (!incomingStream) return;

      // NOTE: We MUST verify if this call happens during render. 
      // PC events are async (micro/macro tasks), so usually fine. 
      // The issue "Cannot update while rendering" might be due to createPeer called synchronously? 
      // createPeer is called in EFFECTS only. 

      // We will wrap state updates in requestAnimationFrame or setTimeout just to be safe if race occurs,
      // but usually not needed if call stack assumes async.

      setRemoteStreams((prev) => {
        const existingCamera = prev[remoteId];
        if (!existingCamera) {
          return { ...prev, [remoteId]: incomingStream };
        }
        if (existingCamera.id !== incomingStream.id) {
          console.log('[useWebRTC] Detected secondary stream (Screen Share) for', remoteId);
          setRemoteScreenShare(remoteId, incomingStream);

          // ADDED: Listen for removal (mute/ended)
          const track = incomingStream.getVideoTracks()[0];
          if (track) {
            const handleRemove = () => {
              console.log('[useWebRTC] Remote Screen Share ended for', remoteId);
              setRemoteScreenShare(remoteId, null);
            };
            track.onmute = handleRemove;
            track.onended = handleRemove;
            incomingStream.onremovetrack = handleRemove;
          }

          return prev;
        }
        return prev;
      });
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && socket) {
        socket.emit('ice-candidate', { target: remoteId, candidate: ev.candidate });
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        makingOfferMap.current[remoteId] = true;
        console.log('[useWebRTC] Negotiation needed for', remoteId);

        // Modern WebRTC: setLocalDescription() without args creates offer implicitly
        await pc.setLocalDescription();

        if (pc.localDescription) {
          socket?.emit('offer', { target: remoteId, sdp: pc.localDescription });
        }
      } catch (e) {
        console.error('Negotiation failed', e);
      } finally {
        makingOfferMap.current[remoteId] = false;
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[useWebRTC] pc state', remoteId, pc.connectionState);
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        try { pc.close(); } catch (e) { }
        delete pcs.current[remoteId];
        setRemoteStreams((prev) => {
          const out = { ...prev };
          delete out[remoteId];
          return out;
        });
        setRemoteScreenShare(remoteId, null);
        removeParticipant(remoteId);
      }
    };

    pcs.current[remoteId] = pc;
    return pc;
  }

  // Helper to process queued candidates
  const processIceQueue = async (remoteId: string, pc: RTCPeerConnection) => {
    const queue = iceCandidatesQueue.current[remoteId];
    if (queue && queue.length > 0) {
      console.log(`[useWebRTC] Processing ${queue.length} queued ICE candidates for ${remoteId}`);
      for (const candidate of queue) {
        await pc.addIceCandidate(candidate).catch(e => console.error('Failed to add queued ICE', e));
      }
      delete iceCandidatesQueue.current[remoteId];
    }
  };

  // Signaling Handlers with PERFECT NEGOTIATION Pattern
  useEffect(() => {
    if (!socket) return;
    const onOffer = async ({ sender, sdp }: { sender: string; sdp: any }) => {
      console.log('[useWebRTC] offer from', sender);
      const pc = createPeer(sender);

      // COLLISION HANDLING
      const isPolite = (socket.id || '') > sender;
      // We are making an offer if the flag is true
      const makingOffer = makingOfferMap.current[sender] || false;
      const readyForOffer = !pc.signalingState || pc.signalingState === 'stable' || pc.signalingState === 'have-remote-offer';

      const offerCollision = (sdp.type === 'offer') && (makingOffer || !readyForOffer);

      if (offerCollision && !isPolite) {
        console.warn('[useWebRTC] GLARE. Impolite ignore.');
        return; // Impolite peer ignores colliding offer
      }

      try {
        if (offerCollision && isPolite) {
          console.log('[useWebRTC] GLARE. Polite rollback.');
          // Polite peer rolls back to accept impolite offer
          await pc.setLocalDescription({ type: 'rollback' });
        }

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // Answer if it's an offer (implicit in negotiation usually but explicit here)
        if (sdp.type === 'offer') {
          await pc.setLocalDescription(); // Create answer
          socket?.emit('answer', { target: sender, sdp: pc.localDescription });
        }

        // FLUSH ICE QUEUE
        await processIceQueue(sender, pc);
      } catch (err) {
        console.error('[useWebRTC] Error handling offer', err);
      }
    };



    const onAnswer = async ({ sender, sdp }: { sender: string; sdp: any }) => {
      const pc = pcs.current[sender];
      if (!pc) return;
      try {
        if (pc.signalingState === 'stable') {
          console.warn('[useWebRTC] Answer received but stable. Ignoring.');
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        // FLUSH ICE QUEUE
        await processIceQueue(sender, pc);
      } catch (e) { console.error('[useWebRTC] onAnswer error', e); }
    };

    const onIce = ({ sender, candidate }: { sender: string; candidate: any }) => {
      const pc = pcs.current[sender];
      if (!pc) return; // Should we create? usually offer comes first.

      if (!pc.remoteDescription) {
        console.log(`[useWebRTC] Queuing ICE candidate for ${sender} (no remote description)`);
        if (!iceCandidatesQueue.current[sender]) iceCandidatesQueue.current[sender] = [];
        iceCandidatesQueue.current[sender].push(candidate);
      } else {
        pc.addIceCandidate(candidate).catch(console.error);
      }
    };

    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIce);

    return () => {
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIce);
    };
  }, [socket]);

  const ignoreOfferRef = useRef<Record<string, boolean>>({});

  // Room Logic - REMOVED MANUAL OFFERS to avoid Race Conditions with onnegotiationneeded
  useEffect(() => {
    if (!socket) return;
    const onRoomCreated = async (data: { roomId: string, peers: any[] }) => {
      console.log('[useWebRTC] room-created', data);
      setCallState('connected');
      data.peers.forEach(async (user) => {
        const remoteId = user.peerId || user.id;
        if (!remoteId || (socket?.id && socket.id === remoteId)) return;
        addParticipant(user);

        // Just create Peer. 
        // If we are initiator, onnegotiationneeded makes the offer.
        // If we are NOT initiator, we just wait.
        // How to ensure negotiationneeded fires?
        // createPeer adds tracks -> fires negotiationneeded.
        // DOES IT? 
        // Only if tracks exist.
        // If NO tracks (unlikely unless camera failed), negotiationneeded won't fire.
        // So we might need a manual kickstart IF no tracks.
        // But we always have tracks ideally.

        // Wait, if we are "Polite" (Follower), we SHOULD NOT add tracks first?
        // No, both add tracks. But Initiate vs Answer logic separates them.
        // "Tie-breaker" for who OFFERS.

        if (socket?.id && socket.id < remoteId) {
          // We are Initiator.
          // createPeer adds the tracks.
          // We TRUST onnegotiationneeded to fire.
          // OR we can manually add a data channel to force it if needed.
          createPeer(remoteId);
        } else {
          // We are Follower. We wait.
          // We ALSO createPeer to add our tracks so they are ready?
          // If we createPeer now, we also add tracks.
          // If we add tracks, 'onnegotiationneeded' fires for US too!
          // Then WE also send an offer.
          // Double Offer again?

          // Standard Pattern:
          // Only Initiator adds tracks? No, WebRTC is symmetric media.
          // Both add tracks.
          // Both fire negotiationneeded.
          // Both send offers.
          // Glare handling (Polite Peer) solves this!

          // So YES, we createPeer for EVERYONE.
          createPeer(remoteId);
        }
      });
    };

    const onUserJoined = async (user: any) => {
      const remoteId = user.peerId || user.id;
      if (!remoteId || (socket?.id && socket.id === remoteId)) return;
      addParticipant(user);
      createPeer(remoteId); // Just create, let glare logic handle the rest
    };

    socket.on('room-created', onRoomCreated);
    socket.on('user-joined', onUserJoined);
    return () => {
      socket.off('room-created', onRoomCreated);
      socket.off('user-joined', onUserJoined);
    };
  }, [socket, setCallState, addParticipant]);

  const stopScreenShare = () => {
    if (!localScreenStreamRef.current) return;

    const tracks = localScreenStreamRef.current.getTracks();
    tracks.forEach(track => {
      track.stop();
      // Remove from PCs
      Object.values(pcs.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track === track);
        if (sender) pc.removeTrack(sender);
      });
    });

    localScreenStreamRef.current = null;
    setLocalScreenStream(null);
    setIsScreenSharing(false);
  };

  const createPeerCallback = useCallback((id: string) => createPeer(id), []);

  const closePeerCallback = useCallback((id: string) => {
    if (pcs.current[id]) {
      try { pcs.current[id].close(); } catch (e) { }
    }
    delete pcs.current[id];
    setRemoteStreams(p => { const n = { ...p }; delete n[id]; return n; });
    setRemoteScreenShare(id, null);
    removeParticipant(id);
  }, [removeParticipant, setRemoteScreenShare]);

  const stopAll = useCallback(() => {
    console.trace('[useWebRTC] stopAll');
    stopMediaRefs();
    Object.values(pcs.current).forEach(pc => { try { pc.close() } catch (e) { } });
    pcs.current = {};
    setLocalStream(null);
    setLocalScreenStream(null);
    setCallState('idle');
    setIsScreenSharing(false);
  }, [setLocalStream, setLocalScreenStream, setCallState]);

  const shareScreenCallback = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      localScreenStreamRef.current = screenStream;
      setLocalScreenStream(screenStream);
      setIsScreenSharing(true);
      screenStream.getTracks().forEach(track => {
        Object.values(pcs.current).forEach(pc => pc.addTrack(track, screenStream));
        track.onended = () => stopScreenShare();
      });
    } catch (e) {
      console.error("Screen share failed", e);
      setIsScreenSharing(false);
    }
  }, [isScreenSharing, setLocalScreenStream]); // Dependencies for shareScreen

  return {
    localStream: localStreamRef.current,
    remoteStreams,
    createPeer: createPeerCallback,
    closePeer: closePeerCallback,
    stopAll,
    shareScreen: shareScreenCallback,
    isScreenSharing,
    // Removed direct store access to avoid reactivity issues. 
    // page.tsx accesses these values via useCallStore().
  };
}
