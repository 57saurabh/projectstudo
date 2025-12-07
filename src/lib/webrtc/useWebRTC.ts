// src/lib/webrtc/useWebRTC.ts
'use client';
import { useEffect, useRef, useState } from 'react';
import { useSignaling } from './SignalingContext';
import { useCallStore } from '@/lib/store/useCallStore';

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

  const pcs = useRef<PeerMap>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  // getUserMedia once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) return;
        localStreamRef.current = stream;
        setLocalStream(stream);
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
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      // close all peers
      Object.values(pcs.current).forEach((pc) => {
        try {
          pc.close();
        } catch (e) { }
      });
      pcs.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function createPeer(remoteId: string) {
    if (pcs.current[remoteId]) return pcs.current[remoteId];

    const pc = new RTCPeerConnection(PC_CONFIG);
    console.log('[useWebRTC] createPeer', remoteId);

    // attach local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStreamRef.current!);
        } catch (e) { }
      });
    }

    const remoteStream = new MediaStream();
    pc.ontrack = (ev) => {
      ev.streams.forEach((s) => {
        s.getTracks().forEach((t) => {
          try {
            remoteStream.addTrack(t);
          } catch (e) { }
        });
      });
      setRemoteStreams((prev) => ({ ...prev, [remoteId]: remoteStream }));
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && socket) {
        socket.emit('ice-candidate', { target: remoteId, candidate: ev.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[useWebRTC] pc state', remoteId, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        try {
          pc.close();
        } catch (e) { }
        delete pcs.current[remoteId];
        setRemoteStreams((prev) => {
          const out = { ...prev };
          delete out[remoteId];
          return out;
        });
        removeParticipant(remoteId);
      }
    };

    pcs.current[remoteId] = pc;
    return pc;
  }

  // signaling handlers
  useEffect(() => {
    if (!socket) return;
    const onOffer = async ({ sender, sdp }: { sender: string; sdp: any }) => {
      console.log('[useWebRTC] offer from', sender);
      const pc = createPeer(sender);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { target: sender, sdp: pc.localDescription });
      } catch (e) {
        console.error('[useWebRTC] onOffer error', e);
      }
    };

    const onAnswer = async ({ sender, sdp }: { sender: string; sdp: any }) => {
      const pc = pcs.current[sender];
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (e) {
        console.error('[useWebRTC] onAnswer error', e);
      }
    };

    const onIce = ({ sender, candidate }: { sender: string; candidate: any }) => {
      const pc = pcs.current[sender];
      if (!pc) return;
      pc.addIceCandidate(candidate).catch((err) => console.error('[useWebRTC] addIceCandidate', err));
    };

    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIce);

    return () => {
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIce);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // when server tells us 'user-joined', create peer and offer
  useEffect(() => {
    if (!socket) return;
    const onUserJoined = async (user: any) => {
      const remoteId = user.peerId || user.id;
      if (!remoteId) return;

      // Ignore self
      if (socket && socket.id === remoteId) {
        console.log('[useWebRTC] Ignoring user-joined for self');
        return;
      }

      console.log('[useWebRTC] user-joined', remoteId);
      addParticipant(user);

      // Tie-breaker for initial connection
      if (socket && socket.id && socket.id < remoteId) {
        console.log('[useWebRTC] Initiating offer to', remoteId);
        // create pc -> create offer
        const pc = createPeer(remoteId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { target: remoteId, sdp: pc.localDescription });
        } catch (e) {
          console.error('[useWebRTC] create offer error', e);
        }
      } else {
        console.log('[useWebRTC] Waiting for offer from', remoteId);
        // Ensure peer is created so we are ready to receive
        createPeer(remoteId);
      }
    };

    socket.on('user-joined', onUserJoined);

    const onRecommendationEnded = async (data: { reason: string }) => {
      if (data.reason === 'accepted') {
        const proposal = useCallStore.getState().proposal;
        if (!proposal) return;

        const peersToConnect = [];
        if (proposal.candidate) peersToConnect.push(proposal.candidate);
        if (proposal.participants) peersToConnect.push(...proposal.participants);

        for (const pRaw of peersToConnect) {
          const p = pRaw as any;
          const remoteId = p.peerId || p.id;
          if (!remoteId) continue;

          // create peer
          const pc = createPeer(remoteId);

          // Tie-breaker: Identify who offers. 
          // Using generic comparison. Adjust if needed.
          if (socket && socket.id && socket.id < remoteId) {
            console.log('[useWebRTC] Initiating offer to', remoteId);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('offer', { target: remoteId, sdp: pc.localDescription });
            } catch (e) {
              console.error('[useWebRTC] create offer error', e);
            }
          } else {
            console.log('[useWebRTC] Waiting for offer from', remoteId);
          }
        }
      }
    };

    socket.on('recommendation-ended', onRecommendationEnded);

    return () => {
      socket.off('user-joined', onUserJoined);
      socket.off('recommendation-ended', onRecommendationEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  return {
    localStream: localStreamRef.current,
    remoteStreams,
    createPeer: (id: string) => createPeer(id),
    closePeer: (id: string) => {
      if (pcs.current[id]) {
        try {
          pcs.current[id].close();
        } catch (e) { }
        delete pcs.current[id];
        setRemoteStreams((prev) => {
          const out = { ...prev };
          delete out[id];
          return out;
        });
        removeParticipant(id);
      }
    },
    stopAll: () => {
      Object.values(pcs.current).forEach((pc) => {
        try {
          pc.close();
        } catch (e) { }
      });
      pcs.current = {};
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
      }
      setCallState('idle');
    },
  };
}
