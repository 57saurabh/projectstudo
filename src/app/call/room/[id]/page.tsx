'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Radio, Users, MessageSquare, Share2 } from 'lucide-react';
import GoLiveModal from '@/components/live/GoLiveModal';
import ConsentModal from '@/components/live/ConsentModal';
import LiveControls from '@/components/live/LiveControls';
import axios from 'axios';

export default function CallRoomPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const roomId = params.id as string;
    const type = searchParams.get('type') || 'private';
    const { user, token } = useSelector((state: RootState) => state.auth);

    // Call State
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);

    // Go Live State
    const [isConfiguringLive, setIsConfiguringLive] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
    const [livePlatforms, setLivePlatforms] = useState<string[]>([]);
    const [liveViewerCount, setLiveViewerCount] = useState(0);
    const [liveDuration, setLiveDuration] = useState('00:00');
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [consentRequest, setConsentRequest] = useState<{ hostName: string; platforms: string[] } | null>(null);

    // Timer refs
    const liveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const liveStartTimeRef = useRef<number | null>(null);

    useEffect(() => {
        // Mock joining room
        console.log(`Joined room ${roomId} as ${type}`);
        // Mock participants
        setParticipants([
            { id: '1', name: 'Alice', isHost: true },
            { id: '2', name: 'Bob', isHost: false }
        ]);

        return () => {
            if (liveTimerRef.current) clearInterval(liveTimerRef.current);
        };
    }, [roomId, type]);

    // --- Go Live Logic ---

    const handleGoLiveClick = () => {
        setIsConfiguringLive(true);
    };

    const handleStartLive = async (config: { title: string; description: string; platforms: string[] }) => {
        // In a real app, we would emit a socket event here to request consent from others
        // socket.emit('request-live-consent', { roomId, config });
        
        // For this demo, we'll simulate the consent flow immediately for the host
        // and assume others accept (or trigger the modal for testing if we were multi-user)
        
        // Simulate waiting for consent...
        console.log('Requesting consent from participants...');
        
        // Simulate success after 1 second
        setTimeout(async () => {
            try {
                const res = await axios.post('/api/live', {
                    type: type === 'group' ? 'group' : 'friend',
                    activeCallId: roomId,
                    ...config
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setLiveSessionId(res.data._id);
                setLivePlatforms(config.platforms);
                setIsLive(true);
                setIsConfiguringLive(false);

                // Start timer
                liveStartTimeRef.current = Date.now();
                liveTimerRef.current = setInterval(() => {
                    if (liveStartTimeRef.current) {
                        const diff = Math.floor((Date.now() - liveStartTimeRef.current) / 1000);
                        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
                        const secs = (diff % 60).toString().padStart(2, '0');
                        setLiveDuration(`${mins}:${secs}`);
                    }
                    setLiveViewerCount(prev => prev + Math.floor(Math.random() * 2));
                }, 1000);

            } catch (error: any) {
                alert(error.response?.data?.message || 'Failed to start live stream');
            }
        }, 1000);
    };

    const handleStopLive = async () => {
        if (!liveSessionId) return;
        try {
            await axios.put('/api/live', { sessionId: liveSessionId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsLive(false);
            setLiveSessionId(null);
            if (liveTimerRef.current) clearInterval(liveTimerRef.current);
            setLiveDuration('00:00');
            setLiveViewerCount(0);
        } catch (error) {
            console.error('Failed to stop live stream', error);
        }
    };

    // Mock receiving a consent request (for testing UI)
    const triggerMockConsent = () => {
        setConsentRequest({
            hostName: 'Alice',
            platforms: ['youtube', 'instagram']
        });
        setShowConsentModal(true);
    };

    return (
        <div className="relative h-screen bg-gray-900 text-white overflow-hidden flex flex-col">
            
            {/* Live Controls Overlay */}
            <LiveControls 
                isLive={isLive} 
                viewerCount={liveViewerCount} 
                platforms={livePlatforms} 
                onStop={handleStopLive}
                duration={liveDuration}
            />

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
                <div className="flex items-center gap-2">
                    <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md">
                        <Users size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">Room: {roomId}</h1>
                        <p className="text-xs text-gray-300 capitalize">{type} Call</p>
                    </div>
                </div>
                
                {/* Dev Tool to trigger consent modal */}
                <button onClick={triggerMockConsent} className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">
                    Test Consent UI
                </button>
            </div>

            {/* Video Grid */}
            <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center">
                {/* Local User */}
                <div className="relative aspect-video bg-gray-800 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold">
                            You
                        </div>
                    </div>
                    <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-md">
                        You {isMuted && '(Muted)'}
                    </div>
                </div>

                {/* Remote User (Mock) */}
                <div className="relative aspect-video bg-gray-800 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold">
                            Bob
                        </div>
                    </div>
                    <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-md">
                        Bob
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="p-6 flex justify-center items-center gap-4 bg-gradient-to-t from-black/80 to-transparent z-20">
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                
                <button 
                    onClick={() => setIsVideoOff(!isVideoOff)}
                    className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
                >
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>

                {/* Go Live Button */}
                {!isLive && (
                    <button 
                        onClick={handleGoLiveClick}
                        className="p-4 rounded-full bg-teal-600 hover:bg-teal-500 transition-all shadow-[0_0_20px_rgba(20,184,166,0.4)] animate-pulse hover:animate-none"
                        title="Go Live"
                    >
                        <Radio size={24} />
                    </button>
                )}

                <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all">
                    <Share2 size={24} />
                </button>

                <button className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all ml-4">
                    <PhoneOff size={24} />
                </button>
            </div>

            {/* Modals */}
            <GoLiveModal 
                isOpen={isConfiguringLive} 
                onClose={() => setIsConfiguringLive(false)} 
                onStart={handleStartLive}
                isLoading={false}
            />

            <ConsentModal 
                isOpen={showConsentModal}
                hostName={consentRequest?.hostName || 'Host'}
                platforms={consentRequest?.platforms || []}
                onAccept={() => {
                    setShowConsentModal(false);
                    alert('You accepted the live stream request.');
                }}
                onDecline={() => {
                    setShowConsentModal(false);
                    alert('You declined. The stream will not start.');
                }}
            />
        </div>
    );
}
