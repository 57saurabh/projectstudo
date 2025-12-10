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
import InviteUserModal from '@/components/call/random/InviteUserModal';
import MatchOverlay from '@/components/call/random/MatchOverlay';
import VideoGrid from '@/components/call/random/VideoGrid';
import Controls from '@/components/call/random/Controls';
import ChatArea from '@/components/call/random/ChatArea';
import RecommendationsView from '@/components/call/random/RecommendationsView';

export default function RandomChatPage() {
    const { user, token } = useSelector((state: RootState) => state.auth);

    const { messages, chatId, isFriend, remoteIsTyping } = useCallStore();

    // 1. Signaling
    const {
        findMatch,
        acceptMatch,
        skipMatch,
        socket,
        inviteUser,
        sendMessage,
        addRandomUser,
        acceptInvite,
        sendTyping
    } = useSignaling();

    // 2. Call Store (Global State)
    const {
        participants,
        callState,
        setCallState,
        setParticipants,
        proposal,
        remoteScreenShares,
        localScreenStream,
    } = useCallStore();

    // 3. WebRTC (Media & Peers)
    const analysisVideoRef = useRef<HTMLVideoElement>(null);
    const useWebRTC_Hook = useWebRTC(analysisVideoRef);
    const {
        localStream,
        remoteStreams,
        stopAll,
        shareScreen,
        isScreenSharing
    } = useWebRTC_Hook;

    // ...



    // Local UI State
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [inputMessage, setInputMessage] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [hasAccepted, setHasAccepted] = useState(false);

    // Moderation
    const [faceWarning, setFaceWarning] = useState<string | null>(null);
    const [nsfwWarning, setNsfwWarning] = useState<string | null>(null);
    const lastFaceDetectedTime = useRef<number>(Date.now());

    const router = useRouter();

    // -- Lifecycle & Logic --

    // Mount: Socket Listeners
    useEffect(() => {
        if (!socket || !user) return;

        const handleRecommendations = (list: any[]) => {
            console.log('[RandomChat] Received recommendations:', list.length);
            setRecommendations(list);
        };

        const handleConnectionError = (data: { reason: string }) => {
            toast.error(data.reason);
            setCallState('idle');
        };

        const handleJoinRequest = (data: { roomId: string, user: any, voteId: string }) => {
            toast(`User ${data.user.username} wants to join group`, {
                action: {
                    label: 'Accept',
                    onClick: () => socket.emit('vote-entry', { voteId: data.voteId, roomId: data.roomId, decision: 'accept' })
                }
            });
        };

        socket.on('recommendations-list', handleRecommendations);
        socket.on('connection-error', handleConnectionError);
        socket.on('join-request', handleJoinRequest);

        return () => {
            socket.off('recommendations-list', handleRecommendations);
            socket.off('connection-error', handleConnectionError);
            socket.off('join-request', handleJoinRequest);
        };
    }, [socket, user, setCallState]);

    // Loop to refresh recommendations occasionally (Keep alive / Retry)
    useEffect(() => {
        if (!socket) return;
        const interval = setInterval(() => {
            if (callState === 'idle') {
                // If we are stuck in idle for too long, poke the server
                // But mainly "set-online" triggers the match. 
                // get-recommendations will fallback to legacy list if auto-match fails?
                // Actually, backend handleGetRecommendations does NOT trigger auto-match currently (only list).
                // But handleSetOnline DOES.
                // Let's rely on set-online.
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [socket, callState]);

    // State Management: Toggle Online/Offline based on CallState
    useEffect(() => {
        if (!socket) return;

        let timeoutId: NodeJS.Timeout;

        if (callState === 'idle') {
            // Debounce set-online to prevent "blips" during state transitions (e.g. Connected -> Idle -> Connected)
            // or rapid unmount/remount cycles.
            timeoutId = setTimeout(() => {
                console.log('[RandomChat] State is IDLE (Debounced) -> Setting Online');
                socket.emit('set-online');
            }, 500);
        } else {
            console.log('[RandomChat] State changed to', callState, '-> NOT setting online');
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [socket, callState]);

    // Unmount Cleanup
    useEffect(() => {
        return () => {
            if (socket) socket.emit('set-offline');
        };
    }, [socket]);

    const handleConnect = (peerId: string) => {
        if (!socket) return;
        setCallState('matching'); // or 'connecting'
        socket.emit('request-connection', { targetPeerId: peerId });
    };

    const abortCall = useCallback(() => {
        if (socket) {
            // Backend handleLeaveRoom will triggers setOnline + attemptAutoMatch
            socket.emit('leave-room');
        }
        stopAll();
    }, [socket, stopAll]);

    // -- Controls --
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
    const toggleScreenShare = () => {
        shareScreen();
    };

    // -- AI Analysis (Keep existing logic mostly) --
    useEffect(() => {
        if (!localStream || !analysisVideoRef.current || callState !== 'connected') return;

        const videoEl = analysisVideoRef.current;
        videoEl.srcObject = localStream;
        videoEl.play().catch(() => { });

        const interval = setInterval(async () => {
            // ... (Same AI logic as before) ...
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
                    toast.error('NSFW detected');
                    abortCall();
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [localStream, callState, abortCall]);

    // -- Friendship Timer --
    useEffect(() => {
        if (!socket || callState !== 'connected' || !chatId) return;

        const timer = setTimeout(() => {
            console.log('[RandomChat] 90s passed. Checking for friendship...');
            socket.emit('check-friendship');
        }, 90000); // 90 seconds

        return () => clearTimeout(timer);
    }, [socket, callState, chatId]);

    const onSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        sendMessage(participants[0]?.peerId, inputMessage);
        setInputMessage('');
    };

    return (
        <div className="relative flex h-full w-full flex-col bg-background font-sans overflow-hidden text-text-primary">
            <video ref={analysisVideoRef} className="hidden" muted playsInline />

            <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 overflow-hidden">
                <div className="flex-1 relative flex flex-col justify-center items-center bg-surface rounded-3xl overflow-hidden border border-border shadow-2xl">

                    {/* IDLE VIEW: Waiting state (No Recommendations List) */}
                    {callState === 'idle' && !proposal && (
                        <div className="absolute inset-0 z-10 bg-surface/95 flex flex-col items-center justify-center p-8 text-center">
                            <h2 className="text-2xl font-bold mb-4 text-text-primary">Looking for a match...</h2>
                            <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full opacity-50"></div>
                        </div>
                    )}

                    {/* MATCHING VIEW */}
                    {callState === 'matching' && !proposal && (
                        <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-sm flex items-center justify-center">
                            <div className="text-text-primary text-xl animate-pulse font-bold">Connecting...</div>
                        </div>
                    )}

                    {/* MATCH PROPOSAL OVERLAY (Prioritize over idle/matching if proposal exists) */}
                    {(callState === 'proposed' || (proposal && callState !== 'connected')) && (
                        <MatchOverlay
                            callState={callState === 'idle' ? 'proposed' : callState} // Force 'proposed' visual state if idle
                            currentPeer={proposal?.candidate}
                            onAccept={() => {
                                if (proposal && proposal.candidate) {
                                    const targetId = proposal.candidate.peerId || proposal.candidate.userId || 'unknown';
                                    acceptMatch(targetId);
                                }
                            }}
                            onSkip={() => {
                                if (proposal && proposal.candidate) {
                                    const targetId = proposal.candidate.peerId || proposal.candidate.userId || 'unknown';
                                    skipMatch(targetId);
                                } else {
                                    skipMatch();
                                }
                                setHasAccepted(false);
                            }}
                            hasAccepted={hasAccepted}
                            setHasAccepted={setHasAccepted}
                        />
                    )}

                    {/* CONNECTED VIEW (Strictly Connected) */}
                    {callState === 'connected' && (
                        <>
                            <VideoGrid
                                participants={participants}
                                remoteStreams={remoteStreams}
                                remoteScreenShares={remoteScreenShares}
                                localScreenStream={localScreenStream}
                                callState={callState}
                            />

                            {/* Local Video - Only show when connected or fitting to layout */}
                            <div className="absolute top-4 right-4 w-32 sm:w-40 md:w-56 aspect-[4/3] z-20 overflow-hidden rounded-xl border-2 border-gold/20 bg-surface shadow-lg">
                                <LocalVideo />
                            </div>
                        </>
                    )}

                    {callState === 'connected' && (
                        <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center pointer-events-none">
                            <div className="pointer-events-auto">
                                <Controls
                                    isMuted={isMuted}
                                    toggleMic={toggleMic}
                                    toggleScreenShare={toggleScreenShare}
                                    isScreenSharing={isScreenSharing}
                                    showChat={showChat}
                                    setShowChat={setShowChat}
                                    onSkip={abortCall}
                                    onAddFriend={() => { }}
                                    canAddFriend={false}
                                    onInvite={() => { }}
                                    onAddRandomUser={() => {
                                        // "Next" logic: Leave current room -> automatic backend toggle to online -> match
                                        abortCall();
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

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
            </main>
        </div>
    );
}
