'use client';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useWebRTC } from '@/lib/webrtc/useWebRTC';
import { useSignaling } from '@/lib/webrtc/SignalingContext';
import { useCallStore } from '@/lib/store/useCallStore';
import { useRouter } from 'next/navigation';
import LocalVideo from '@/components/video/LocalVideo';
import axios from 'axios';
import { toast } from 'sonner';

// AI Services
import { remoteAiService } from '@/lib/ai/RemoteAiService';

// Components
// import RandomChatHeader from '@/components/call/random/RandomChatHeader';
import IncomingInvite from '@/components/call/random/IncomingInvite';
import InviteUserModal from '@/components/call/random/InviteUserModal';
import MatchOverlay from '@/components/call/random/MatchOverlay';
import VideoGrid from '@/components/call/random/VideoGrid';
import Controls from '@/components/call/random/Controls';
import ChatArea from '@/components/call/random/ChatArea';
import RecommendationsView from '@/components/call/random/RecommendationsView';

export default function RandomChatPage() {
    const { user, token } = useSelector((state: RootState) => state.auth);

    // 1. Signaling & Socket
    const {
        socket,
        findMatch,
        acceptMatch,
        skipMatch,
        inviteUser,
        acceptInvite,
        rejectInvite,
        sendMessage,
        addRandomUser
    } = useSignaling();

    // 2. Call Store (Global State)
    const {
        participants,
        callState,
        setCallState,
        proposal,            // replaced recommendations
        setProposal,
        // Helper to clear proposal if needed
        clearProposal
    } = useCallStore();

    // 3. WebRTC (Media & Peers)
    // We pass the local video ref so it auto-plays the stream
    const analysisVideoRef = useRef<HTMLVideoElement>(null);
    const {
        localStream,
        remoteStreams,
        // stopAll 
    } = useWebRTC(analysisVideoRef);

    // Mute/Cam toggle logic is now likely in useWebRTC or implemented manually using localStream tracks?
    // The new useWebRTC didn't return toggleMic/Cam. We should implement them here or in a helper.
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

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

    // Screen share logic seemed missing in new useWebRTC, we can re-implement or comment out for now.
    const toggleScreenShare = () => { toast.info("Screen share coming soon"); };

    const abortCall = useCallback(() => {
        // Stop media and signal server
        // useWebRTC.stopAll() if available?
        // signal.abortCall?
        // effectively leave room
        socket?.emit('disconnect-call');
        setCallState('idle');
    }, [socket, setCallState]);

    const [inputMessage, setInputMessage] = useState('');
    const [userCount, setUserCount] = useState(0);
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        // Default to open only on large screens
        if (window.innerWidth >= 1024) {
            setShowChat(true);
        }
    }, []);
    const [canAddFriend, setCanAddFriend] = useState(false);
    const [countdown, setCountdown] = useState(30);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [hasAccepted, setHasAccepted] = useState(false);
    // Proposals (mapped to old recommendations UI)
    const recommendations = useMemo(() => {
        if (!proposal) return [];

        let rawList: any[] = [];
        // Prioritize explicit candidate if available (e.g. 1v1 match)
        if (proposal.candidate) {
            rawList = [proposal.candidate];
        } else if (proposal.participants && proposal.participants.length > 0) {
            // Fallback to participants (e.g. group invite or filtered 1v1)
            rawList = proposal.participants;
        }

        // Filter out self
        const mySocketId = socket?.id;
        const myUserId = user?.id || (user as any)?._id;

        const filtered = rawList.filter(p => {
            const isSocketMatch = mySocketId && (p.peerId === mySocketId || p.id === mySocketId);
            const isUserMatch = myUserId && (p.userId === myUserId || p.id === myUserId);
            return !isSocketMatch && !isUserMatch;
        });

        if (filtered.length === 0 && rawList.length > 0) {
            console.warn('[RandomChat] All recommendations filtered out (Self detected). Raw:', rawList.length);
        }

        return filtered;
    }, [proposal, socket?.id, user]);

    const showRecommendationModal = !!proposal && recommendations.length > 0;
    const recommendationsType = proposal?.type || 'incoming';
    // Helper to hide modal locally if needed, but mainly we listen to store
    const setShowRecommendationModal = (show: boolean) => { if (!show) clearProposal(); };
    const setRecommendations = (...args: any[]) => { }; // no-op compatibility
    // Auto-requeue on timeout/error
    useEffect(() => {
        if (!socket) return;
        const handleEnded = (data: any) => {
            console.log('[RandomChat] Recommendation ended:', data);
            if (data.reason === 'timeout' || data.reason === 'invalid-recommendation') {
                console.log('[RandomChat] Auto-requeuing due to', data.reason);
                // Short delay to let UI clear
                setTimeout(() => {
                    findMatch();
                }, 1000);
            }
        };
        socket.on('recommendation-ended', handleEnded);
        return () => { socket.off('recommendation-ended', handleEnded); };
    }, [socket, findMatch]);

    // Moderation State
    const [faceWarning, setFaceWarning] = useState<string | null>(null);
    const [nsfwWarning, setNsfwWarning] = useState<string | null>(null);
    const lastFaceDetectedTime = useRef<number>(Date.now());
    const isModelsLoaded = useRef<boolean>(false);

    // In random chat, we assume the first participant is the peer
    const currentPeer = participants.length > 0 ? participants[0] : undefined;
    const messages: any[] = []; // Chat temporarily disabled pending store update
    const currentPeerId = currentPeer?.peerId;

    // Debug logging for proposal flow
    useEffect(() => {
        if (proposal) {
            console.log('[RandomChat] Proposal updated:', {
                id: proposal.roomId,
                candidate: (proposal.candidate as any)?.username,
                participants: (proposal.participants || []).length,
                myId: user?.id || (user as any)?._id
            });
        }
    }, [proposal, user]);

    useEffect(() => {
        console.log('[RandomChat] Recommendations derived:', recommendations.length, 'Type:', recommendationsType);
    }, [recommendations, recommendationsType]);

    // Load AI Models (Not needed for remote)
    // useEffect(() => { ... }, []);

    // Analysis Loop
    useEffect(() => {
        if (!localStream || !analysisVideoRef.current) return;

        const videoEl = analysisVideoRef.current;
        videoEl.srcObject = localStream;
        if (videoEl.paused) {
            videoEl.play().catch(e => {
                // Ignore AbortError and "interrupted" errors common with rapid stream updates
                if (e.name === 'AbortError' || e.message?.includes('interrupted')) {
                    return;
                }
                console.error('Analysis video play error:', e);
            });
        }

        const interval = setInterval(async () => {
            if (videoEl.paused || videoEl.ended || videoEl.readyState < 2) return;

            const now = Date.now();

            // Call Python AI Service
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
                        toast.error('Call aborted: Face not visible for too long.');
                    } else if (timeSinceLastFace > 30000) { // 30 seconds
                        setFaceWarning('Face not visible! Call will end soon.');
                    }
                }

                // 2. NSFW Detection
                if (!result.isSafe) {
                    setNsfwWarning(result.reason || 'Inappropriate content detected');
                    abortCall();
                    toast.error(`Call aborted: ${result.reason}`);
                } else {
                    setNsfwWarning(null);
                }
            }

        }, 1000); // Check every second

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
                        if (!hasAccepted && currentPeerId) {
                            setHasAccepted(true);
                            acceptMatch(currentPeerId); // Auto-accept
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
        // Enforce Pre-Check
        const hasPassedPreCheck = sessionStorage.getItem('preCheckPassed');
        if (!hasPassedPreCheck) {
            router.push('/call/pre-check');
            return;
        }

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

            socket.on('call-ended', (data: { reason: string }) => {
                console.log('Call ended:', data.reason);
                // Alert user (optional, maybe a toast is better but alert is quick for now)
                // alert(`Call ended: ${data.reason}`); 
                // Actually, let's just show a quick status or just restart search

                // Reset state and search again
                abortCall();
                findMatch();
            });



            socket.on('recommendation-vote-ack', (data) => {
                toast.info('Waiting for other user...');
            });

            socket.on('recommendation-ended', (data: { reason: string, by?: string }) => {
                // State update handled by SignalingContext (clearing proposal)
                // We just handle toasts here

                if (data.reason === 'skipped' || data.reason === 'declined') {
                    if (data.by === socket.id) toast.info('You declined.');
                    else toast.error('Match declined.');
                } else if (data.reason === 'accepted') {
                    toast.success('Connected!');
                } else if (data.reason === 'room-full') {
                    toast.error('Room is full.');
                } else if (data.reason === 'candidate-busy' || data.reason === 'candidate-disconnected') {
                    toast.error('User unavailable.');
                }
            });
        }

        return () => {
            socket?.off('user-count');
            socket?.off('call-ended');
            socket?.off('proposal-received');
            // Abort call and reset state on unmount (route change)
            abortCall();
        };
    }, [socket, abortCall, findMatch]);

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
            await axios.post('/api/friends/send', { receiverId: currentPeer.userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('You have been connected for 90s! Friend request sent automatically.');
        } catch (error) {
            console.error('Failed to auto-add friend:', error);
            toast.error('Failed to send auto-friend request');
        }
    };

    const handleAddRandomUser = () => {
        addRandomUser();
        toast.info('Searching for another user to add...');
    };

    const handleInviteUser = (targetId: string) => {
        inviteUser(targetId);
        setShowInviteModal(false);
        toast.success(`Invite sent to ${targetId}`);
    };

    return (
        <div className="relative flex h-full w-full flex-col bg-background font-sans overflow-hidden text-text-primary">
            {/* Hidden Video for Analysis */}
            <video ref={analysisVideoRef} className="hidden" muted playsInline />

            {/* <RandomChatHeader user={user} /> */}

            {/* Incoming Invite - Temporarily Disabled */}
            {/* <IncomingInvite
                    pendingInvite={null} 
                    onAccept={acceptInvite}
                    onReject={rejectInvite}
                /> */}

            <InviteUserModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onInvite={handleInviteUser}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 overflow-hidden">

                {/* Video Area */}
                <div className="flex-1 relative flex flex-col justify-end items-center bg-surface rounded-3xl overflow-hidden border border-border shadow-2xl">

                    <MatchOverlay
                        callState={callState}
                        currentPeer={currentPeer}
                        countdown={countdown}
                        hasAccepted={hasAccepted}
                        onAccept={() => currentPeer?.peerId && acceptMatch(currentPeer.peerId)}
                        onSkip={handleSkipPending}
                        setHasAccepted={setHasAccepted}
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

                    {/* Error Toast - Temporarily Removed */}

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

                    {showRecommendationModal && recommendations.length > 0 && (
                        <RecommendationsView
                            recommendations={recommendations}
                            onConnect={(peerId) => {
                                // Accept Logic
                                if (proposal?.roomId) {
                                    // Robust Voting: Use the explicit Key ID provided by backend
                                    let targetPeerId = proposal.keyId;

                                    // Fallback for legacy support (or if keyId missing)
                                    if (!targetPeerId) {
                                        const candidateObj = proposal.candidate as any;
                                        const explicitCandidateId = candidateObj?.peerId || candidateObj?.id;
                                        if (proposal.type === 'outgoing') {
                                            targetPeerId = explicitCandidateId;
                                        } else {
                                            targetPeerId = socket?.id;
                                        }
                                        if (!targetPeerId) targetPeerId = explicitCandidateId;
                                    }

                                    if (!targetPeerId) {
                                        console.error('[RandomChat] Critical: No target peer ID resolved', proposal);
                                        return;
                                    }

                                    console.log('[RandomChat] Accepting match:', {
                                        action: 'accept',
                                        recommendedPeerId: targetPeerId,
                                        roomId: proposal.roomId,
                                        usingKeyId: !!proposal.keyId
                                    });

                                    socket?.emit("recommendation-action", {
                                        action: "accept",
                                        recommendedPeerId: targetPeerId,
                                        roomId: proposal.roomId
                                    }, (ack: any) => {
                                        console.log('[RandomChat] Backend ACK:', ack);
                                    });
                                } else {
                                    console.warn('[RandomChat] Cannot accept: proposal.roomId is missing', proposal);
                                }
                                // Do NOT close modal here. Wait for 'recommendation-ended'.
                            }}
                            onClose={() => {
                                // Decline Logic
                                if (proposal?.roomId) {
                                    // Same candidate logic for decline tracking if needed, or just decline room
                                    const candidateId = recommendationsType === "incoming" ? recommendations[0]?.peerId : socket?.id;

                                    socket?.emit("recommendation-action", {
                                        action: "decline",
                                        recommendedPeerId: candidateId,
                                        roomId: proposal.roomId
                                    });
                                }
                                setShowRecommendationModal(false);
                                setRecommendations([]);
                            }}


                            title={recommendationsType === "incoming" ? "Match Found" : "Invited to Join"}
                        />
                    )}

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
