import React from 'react';
import { useCallStore } from '@/lib/store/useCallStore';
import { Button } from '../ui/Button';
import { useWebRTC } from '@/lib/webrtc/useWebRTC';

export const ControlBar: React.FC = () => {
    const { isMuted, isVideoOff, isScreenSharing, toggleMute, toggleVideo, setInCall } = useCallStore();
    const { toggleScreenShare } = useWebRTC();

    return (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 glass px-6 py-4 rounded-2xl flex gap-4 z-50">
            <Button
                variant="ghost"
                onClick={toggleMute}
                className={isMuted ? "bg-red-500/20 text-red-500 border-red-500/50" : ""}
            >
                {isMuted ? 'Unmute' : 'Mute'}
            </Button>

            <Button
                variant="ghost"
                onClick={toggleVideo}
                className={isVideoOff ? "bg-red-500/20 text-red-500 border-red-500/50" : ""}
            >
                {isVideoOff ? 'Start Video' : 'Stop Video'}
            </Button>

            <Button
                variant="ghost"
                onClick={toggleScreenShare}
                className={isScreenSharing ? "bg-green-500/20 text-green-500 border-green-500/50" : ""}
            >
                {isScreenSharing ? 'Stop Share' : 'Share Screen'}
            </Button>

            <Button variant="danger" onClick={() => setInCall(false)}>
                Leave
            </Button>
        </div>
    );
};
