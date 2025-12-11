'use client';

import { useRef, useEffect, useState } from 'react';
import { useCallStore } from '@/lib/store/useCallStore';
import { useSignaling } from '@/lib/webrtc/SignalingContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { toast } from 'sonner';
import { remoteAiService } from '@/lib/ai/RemoteAiService';

import LocalVideo from '@/components/video/LocalVideo';
import VideoGrid from '@/components/call/random/VideoGrid';
import Controls from '@/components/call/random/Controls';
import ChatArea from '@/components/call/random/ChatArea';

interface ActiveCallViewProps {
    webrtc: {
        localStream: MediaStream | null;
        remoteStreams: Record<string, MediaStream>;
        shareScreen: () => Promise<void>;
        stopAll: () => void;
        isScreenSharing: boolean;
        // Add any other methods from useWebRTC hook if needed
    };
    onLeave: () => void;
    onNext?: () => void;
    isRandomMode?: boolean;
}

export default function ActiveCallView({
    webrtc,
    onLeave,
    onNext,
    isRandomMode = false
}: ActiveCallViewProps) {
    const { user } = useSelector((state: RootState) => state.auth);
    const {
        participants,
        callState,
        remoteScreenShares,
        localScreenStream,
        chatId,
        messages,
        isFriend,
        remoteIsTyping
    } = useCallStore();

    const {
        sendMessage,
        sendTyping
    } = useSignaling();

    const { localStream, remoteStreams, shareScreen, isScreenSharing } = webrtc;

    // Local UI State
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [inputMessage, setInputMessage] = useState('');
    const [showChat, setShowChat] = useState(false);

    // AI / Safety State
    const analysisVideoRef = useRef<HTMLVideoElement>(null);
    const [faceWarning, setFaceWarning] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [nsfwWarning, setNsfwWarning] = useState<string | null>(null);
    const lastFaceDetectedTime = useRef<number>(Date.now());

    // -- Controls Logic --
    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
            setIsMuted(!localStream.getAudioTracks()[0]?.enabled);
        }
    };
    const toggleCam = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
            setIsVideoOff(!localStream.getVideoTracks()[0]?.enabled);
        }
    };

    // -- AI Analysis --
    useEffect(() => {
        if (!localStream || !analysisVideoRef.current || callState !== 'connected') return;

        const videoEl = analysisVideoRef.current;
        videoEl.srcObject = localStream;
        videoEl.play().catch(() => { });

        const interval = setInterval(async () => {
            const result = await remoteAiService.analyze(videoEl);
            if (result) {
                if (result.faceDetected) {
                    lastFaceDetectedTime.current = Date.now();
                    setFaceWarning(null);
                } else {
                    if (Date.now() - lastFaceDetectedTime.current > 30000) {
                        setFaceWarning('Face not visible!');
                    }
                }
                if (!result.isSafe) {
                    console.warn('[ActiveCallView] NSFW detected!');
                    setNsfwWarning('NSFW content detected');
                    toast.error('NSFW detected (Warning)');
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [localStream, callState]);

    const onSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        sendMessage(participants[0]?.peerId, inputMessage);
        setInputMessage('');
    };

    return (
        <div className="relative flex h-full w-full flex-col overflow-hidden">
            {/* Hidden Analysis Video */}
            <video ref={analysisVideoRef} className="hidden" muted playsInline />

            {/* Video Grid Area */}
            <div className="flex-1 relative flex flex-col justify-center items-center bg-surface rounded-3xl overflow-hidden border border-border shadow-2xl">

                {/* Connected View */}
                {callState === 'connected' && (
                    <>
                        <VideoGrid
                            participants={participants}
                            remoteStreams={remoteStreams}
                            remoteScreenShares={remoteScreenShares}
                            localScreenStream={localScreenStream}
                            callState={callState}
                        />

                        {/* Local Video Overlay */}
                        <div className="absolute top-4 right-4 w-32 sm:w-40 md:w-56 aspect-[4/3] z-20 overflow-hidden rounded-xl border-2 border-gold/20 bg-surface shadow-lg">
                            <LocalVideo />
                        </div>

                        {/* Warnings Overlay */}
                        {faceWarning && (
                            <div className="absolute top-4 left-4 bg-red-500/80 text-white px-4 py-2 rounded-xl backdrop-blur-md z-30 animate-pulse font-bold">
                                {faceWarning}
                            </div>
                        )}

                        {/* Controls */}
                        <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center pointer-events-none">
                            <div className="pointer-events-auto w-full md:w-auto px-4">
                                <Controls
                                    isMuted={isMuted}
                                    toggleMic={toggleMic}
                                    toggleScreenShare={shareScreen}
                                    isScreenSharing={isScreenSharing}
                                    showChat={showChat}
                                    setShowChat={setShowChat}
                                    onSkip={onLeave}
                                    onAddFriend={() => { }} // Placeholder, logic can be passed if needed
                                    canAddFriend={isRandomMode}
                                    onInvite={() => { }} // Placeholder
                                    onAddRandomUser={() => {
                                        if (onNext) onNext();
                                        else onLeave();
                                    }}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Chat Area (Side Panel) */}
            <ChatArea
                showChat={showChat}
                messages={messages}
                user={user}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                onSendMessage={onSendMessage}
                currentPeerId={participants[0]?.peerId}
                chatId={chatId}
                isFriend={isFriend}
                remoteIsTyping={remoteIsTyping}
                sendTyping={sendTyping}
            />
        </div>
    );
}
