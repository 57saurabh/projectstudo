'use client';
import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useWebRTC } from '@/lib/webrtc/useWebRTC';
import { useCallStore } from '@/lib/store/useCallStore';
import { useRouter } from 'next/navigation';
import LocalVideo from '@/components/video/LocalVideo';
import axios from 'axios';

// AI Services
import { remoteAiService } from '@/lib/ai/RemoteAiService';

// Components
import RandomChatHeader from '@/components/call/random/RandomChatHeader';
import IncomingInvite from '@/components/call/random/IncomingInvite';
import InviteUserModal from '@/components/call/random/InviteUserModal';
import MatchOverlay from '@/components/call/random/MatchOverlay';
import ConnectingOverlay from '@/components/call/random/ConnectingOverlay';
import VideoGrid from '@/components/call/random/VideoGrid';
import Controls from '@/components/call/random/Controls';
import ChatArea from '@/components/call/random/ChatArea';

export default function RandomChatPage() {
    const { user, token } = useSelector((state: RootState) => state.auth);
    const { findMatch, sendMessage, skipMatch, socket, addRandomUser, acceptMatch, toggleMic, toggleCam, toggleScreenShare, inviteUser, acceptInvite, rejectInvite, abortCall, localStream } = useWebRTC();
    const { participants, messages, isMuted, isVideoOff, mediaError, remoteStreams, callState, pendingInvite } = useCallStore();

    const [inputMessage, setInputMessage] = useState('');
    const [userCount, setUserCount] = useState(0);
    const [showChat, setShowChat] = useState(true);
    const [canAddFriend, setCanAddFriend] = useState(false);
    const [countdown, setCountdown] = useState(30);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [hasAccepted, setHasAccepted] = useState(false);

    // Moderation State
    const [faceWarning, setFaceWarning] = useState<string | null>(null);
    const [nsfwWarning, setNsfwWarning] = useState<string | null>(null);
    const analysisVideoRef = useRef<HTMLVideoElement>(null);
    const lastFaceDetectedTime = useRef<number>(Date.now());
    const isModelsLoaded = useRef<boolean>(false);

    // In random chat, we assume the first participant is the peer
    const currentPeer = participants[0];
    const currentPeerId = currentPeer?.id;

    // Load AI Models
    // Models are loaded on backend, no need to load here
    // useEffect(() => { ... }, []);

    // Analysis Loop
    // Analysis Loop (Remote)
    useEffect(() => {
        if (!localStream || !analysisVideoRef.current) return;

        const videoEl = analysisVideoRef.current;
        videoEl.srcObject = localStream;
        videoEl.play().catch(e => console.error('Analysis video play error:', e));

        const interval = setInterval(async () => {
            if (videoEl.paused || videoEl.ended || videoEl.readyState < 2) return;

            const now = Date.now();

            // Call Backend API
            const result = await remoteAiService.analyze(videoEl);

            if (result) {
                // 1. Face Detection
                if (result.faceDetected) {
                    lastFaceDetectedTime.current = now;
                    setFaceWarning(null);
                } else {
                    const timeSinceLastFace = now - lastFaceDetectedTime.current;
                    if (timeSinceLastFace > 45000) { // 45 seconds
                        abortCall();
                        alert('Call aborted: Face not visible for too long.');
                    } else if (timeSinceLastFace > 30000) { // 30 seconds
                        setFaceWarning('Face not visible! Call will end soon.');
                    }
                }

                // 2. NSFW Detection
                if (!result.isSafe) {
                    setNsfwWarning(result.unsafeReason || 'Inappropriate content detected');
                    abortCall();
                    alert(`Call aborted: ${result.unsafeReason}`);
                } else {
                    setNsfwWarning(null);
                }
            }

        }, 2000); // Check every 2 seconds to save bandwidth

        return () => {
            clearInterval(interval);
            videoEl.srcObject = null;
        };
    }, [localStream, abortCall]);


    // Countdown logic for pending match
    useEffect(() => {
        if (callState === 'proposed') {
            setCountdown(30);
            setHasAccepted(false); // Reset acceptance state for new match
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        if (!hasAccepted) {
                            setHasAccepted(true);
                            acceptMatch(); // Auto-accept
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [callState, acceptMatch, hasAccepted]);

    const router = useRouter();

    useEffect(() => {
        if (user && !user.avatarUrl) {
            // Redirect to profile page if no avatar
            router.push('/settings/profile');
        }
    }, [user, router]);

    useEffect(() => {
        // Auto-start searching when page loads (only if user has avatar)
        if (callState === 'idle' && user?.avatarUrl) {
            findMatch();
        }
    }, [callState, findMatch, user]);

    useEffect(() => {
        if (socket) {
            socket.on('user-count', (count: number) => {
                setUserCount(count);
            });
        }

        return () => {
            socket?.off('user-count');
            // Abort call and reset state on unmount (route change)
            abortCall();
        };
    }, [socket, abortCall]);

    // Friend Request Timer (3 minutes)
    // Auto-Friend Timer (90 seconds)
    useEffect(() => {
        if (callState === 'connected' && currentPeerId) {
            const timer = setTimeout(() => {
                setCanAddFriend(true);
                // Auto-trigger friend request logic
                // In a real app, we might want to ask confirmation or just do it.
                // User requested: "make them friend"
                handleAddFriend();
            }, 90000); // 90 seconds

            return () => clearTimeout(timer);
        } else {
            setCanAddFriend(false);
        }
    }, [currentPeerId, callState]);

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputMessage.trim() || !currentPeerId) return;

        sendMessage(currentPeerId, inputMessage);
        setInputMessage('');
    };

    const handleSkip = () => {
        if (currentPeerId) {
            skipMatch(currentPeerId);
        } else {
            findMatch(); // If no peer, just search
        }
    };

    const handleSkipPending = () => {
        skipMatch(currentPeerId);
    };

    const handleAddFriend = async () => {
        if (!currentPeer?.userId || !token) return;
        try {
            // We use the existing API to send a friend request
            // If both sides send it (which they will due to the timer), the backend should handle it as "Accept" if logic permits,
            // or we rely on the user to accept the incoming request.
            // For now, we'll send the request.
            await axios.post('/api/friends', { receiverId: currentPeer.userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('You have been connected for 90s! Friend request sent automatically.');
        } catch (error) {
            console.error('Failed to auto-add friend:', error);
        }
    };

    const handleAddRandomUser = () => {
        addRandomUser();
        alert('Searching for another user to add...');
    };

    const handleInviteUser = (targetId: string) => {
        inviteUser(targetId);
        setShowInviteModal(false);
        alert(`Invite sent to ${targetId}`);
    };

    return (
        <div className="relative flex h-screen w-full flex-col bg-[#f7f6f8] dark:bg-[#191121] font-sans overflow-hidden">
            {/* Hidden Video for Analysis */}
            <video ref={analysisVideoRef} className="hidden" muted playsInline />

            <RandomChatHeader user={user} />

            <IncomingInvite
                pendingInvite={pendingInvite}
                onAccept={acceptInvite}
                onReject={rejectInvite}
            />

            <InviteUserModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onInvite={handleInviteUser}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 overflow-hidden">

                {/* Video Area */}
                <div className="flex-1 relative flex flex-col justify-end items-center bg-black/50 rounded-xl overflow-hidden border border-white/10">

                    <MatchOverlay
                        callState={callState}
                        currentPeer={currentPeer}
                        countdown={countdown}
                        hasAccepted={hasAccepted}
                        onAccept={acceptMatch}
                        onSkip={handleSkipPending}
                        setHasAccepted={setHasAccepted}
                    />

                    <ConnectingOverlay
                        callState={callState}
                        currentPeer={currentPeer}
                        onAbort={abortCall}
                        onRetry={findMatch}
                    />

                    <VideoGrid
                        participants={participants}
                        remoteStreams={remoteStreams}
                        callState={callState}
                    />

                    {/* Local Video */}
                    <div className="absolute top-4 right-4 w-32 sm:w-40 md:w-56 aspect-[4/3] z-20">
                        <LocalVideo />
                    </div>

                    {/* Warnings */}
                    {faceWarning && (
                        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 text-black px-6 py-3 rounded-lg shadow-lg z-50 text-base font-bold animate-pulse">
                            ⚠️ {faceWarning}
                        </div>
                    )}
                    {nsfwWarning && (
                        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 bg-red-600/90 text-white px-6 py-3 rounded-lg shadow-lg z-50 text-base font-bold animate-pulse">
                            ⛔ {nsfwWarning}
                        </div>
                    )}

                    {/* Error Toast */}
                    {mediaError && (
                        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium">
                            {mediaError}
                        </div>
                    )}

                    <Controls
                        isMuted={isMuted}
                        toggleMic={toggleMic}
                        toggleScreenShare={toggleScreenShare}
                        showChat={showChat}
                        setShowChat={setShowChat}
                        onSkip={handleSkip}
                        onAddFriend={handleAddFriend}
                        canAddFriend={canAddFriend}
                        onInvite={() => setShowInviteModal(true)}
                        onAddRandomUser={handleAddRandomUser}
                    />
                </div>

                <ChatArea
                    showChat={showChat}
                    messages={messages}
                    user={user}
                    inputMessage={inputMessage}
                    setInputMessage={setInputMessage}
                    onSendMessage={handleSendMessage}
                    currentPeerId={currentPeerId}
                />

            </main>
        </div>
    );
}
