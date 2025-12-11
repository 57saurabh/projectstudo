'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useSignaling } from '@/lib/webrtc/SignalingContext';
import { useCallStore } from '@/lib/store/useCallStore';
import { useWebRTC } from '@/lib/webrtc/useWebRTC';
import ActiveCallView from '@/components/call/shared/ActiveCallView';

export default function CallRoomPage() {
    const params = useParams();
    const roomId = params.id as string;
    const { user } = useSelector((state: RootState) => state.auth);
    const { socket } = useSignaling();
    const { setCallState } = useCallStore();
    const router = useRouter();

    const analysisVideoRef = useRef<HTMLVideoElement>(null);
    const useWebRTC_Hook = useWebRTC(analysisVideoRef);
    const { stopAll } = useWebRTC_Hook;

    useEffect(() => {
        if (!socket || !roomId) return;

        // Join Room if not already in?
        // Usually 'room-created' event handles joining on backend?
        // But on refresh, we might need to rejoin.
        // For now, assume flow redirects here after 'room-created'.

        setCallState('connected');

        return () => {
            // Cleanup on unmount
            stopAll();
            socket.emit('leave-room');
        };
    }, [socket, roomId, setCallState, stopAll]);

    const handleLeave = () => {
        stopAll();
        if (socket) socket.emit('leave-room');
        router.push('/call/private'); // Return to private hub
    };

    return (
        <div className="h-screen w-screen bg-black overflow-hidden relative">
            {/* Hidden video for ref - passed to hook but we might need it for AI if we want to run it here too. 
                ActiveCallView has its own analysisVideoRef... 
                Wait, useWebRTC needs a ref to PLAY the local video.
                If ActiveCallView renders the video, can we pass the ref?
                
                Actually ActiveCallView renders 'LocalVideo' component which uses useCallStore's 'localStream'.
                But useWebRTC hook takes a Ref to auto-play it?
                Let's use a hidden one here just to satisfy the hook's requirement for a ref, 
                or pass null if hook handles it gracefully?
                Hook: "if (localVideoRef.current) ... localVideoRef.current.srcObject = stream"
                
                We can provide a dummy ref here. ActiveCallView handles the AI ref.
            */}
            <video ref={analysisVideoRef} className="hidden" muted playsInline />

            <ActiveCallView
                webrtc={useWebRTC_Hook}
                onLeave={handleLeave}
                isRandomMode={false}
            />
        </div>
    );
}
