'use client';

import { useState, useRef, useEffect } from 'react';
import { Radio, Video, Mic, Share2, Loader2, Monitor, Users, Ghost, Phone, Lock } from 'lucide-react';
import GoLiveModal from '@/components/live/GoLiveModal';
import LiveControls from '@/components/live/LiveControls';
import LiveChat from '@/components/live/LiveChat';
import DeviceSelector from '@/components/live/DeviceSelector';
import RatioSelector from '@/components/live/RatioSelector';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useRouter } from 'next/navigation';

export default function LivePage() {
    const router = useRouter();
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [platforms, setPlatforms] = useState<string[]>([]);
    const [viewerCount, setViewerCount] = useState(0);
    const [duration, setDuration] = useState('00:00');
    
    // Studio State
    const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
    const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [streamMode, setStreamMode] = useState<'broadcast' | 'random' | 'private' | 'group'>('broadcast');

    // Timer ref
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { token } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Initialize Camera (Mandatory)
    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined },
                    audio: { deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
            }
        };

        if (!isScreenSharing) {
            startCamera();
        }
    }, [selectedVideoDevice, selectedAudioDevice, isScreenSharing]);

    const handleStartClick = () => {
        if (streamMode === 'broadcast') {
            setIsConfiguring(true);
        } else {
            // Redirect to respective call pages
            if (streamMode === 'random') router.push('/call/pre-check');
            if (streamMode === 'private') router.push('/call/private');
            if (streamMode === 'group') router.push('/call/group');
        }
    };

    const handleStartBroadcast = async (config: { title: string; description: string; platforms: string[] }) => {
        setIsLoading(true);
        try {
            const res = await axios.post('/api/live', {
                type: 'broadcast',
                ...config
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSessionId(res.data._id);
            setPlatforms(config.platforms);
            setIsLive(true);
            setIsConfiguring(false);
            
            // Start timer
            startTimeRef.current = Date.now();
            timerRef.current = setInterval(() => {
                if (startTimeRef.current) {
                    const diff = Math.floor((Date.now() - startTimeRef.current) / 1000);
                    const mins = Math.floor(diff / 60).toString().padStart(2, '0');
                    const secs = (diff % 60).toString().padStart(2, '0');
                    setDuration(`${mins}:${secs}`);
                }
                setViewerCount(prev => prev + Math.floor(Math.random() * 3));
            }, 1000);

        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to start broadcast');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStopBroadcast = async () => {
        if (!sessionId) return;
        try {
            await axios.put('/api/live', { sessionId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsLive(false);
            setSessionId(null);
            if (timerRef.current) clearInterval(timerRef.current);
            setDuration('00:00');
            setViewerCount(0);
        } catch (error) {
            console.error('Failed to stop broadcast', error);
        }
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            setIsScreenSharing(false);
            // Camera will restart due to useEffect
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setIsScreenSharing(true);
                
                // Handle user stopping screen share via browser UI
                stream.getVideoTracks()[0].onended = () => {
                    setIsScreenSharing(false);
                };
            } catch (error) {
                console.error('Error sharing screen:', error);
            }
        }
    };

    // Calculate container aspect ratio styles
    const getAspectRatioStyle = () => {
        switch (aspectRatio) {
            case '9:16': return 'aspect-[9/16] max-h-[80vh]';
            case '1:1': return 'aspect-square max-h-[80vh]';
            default: return 'aspect-video w-full';
        }
    };

    return (
        <div className="min-h-screen bg-background text-text-primary flex flex-col transition-colors duration-300 relative overflow-hidden">
            
            {/* Live Controls Overlay */}
            <LiveControls 
                isLive={isLive} 
                viewerCount={viewerCount} 
                platforms={platforms} 
                onStop={handleStopBroadcast}
                duration={duration}
            />

            <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden">
                
                {/* Left Panel: Studio Controls (Hidden when live if desired, or kept for control) */}
                {!isLive && (
                    <div className="w-full lg:w-96 bg-surface border-r border-glass-border p-6 overflow-y-auto z-20">
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                <Radio className="text-primary" />
                                Go Live Studio
                            </h1>
                            <p className="text-text-secondary text-sm">Configure your stream settings.</p>
                        </div>

                        <div className="space-y-8">
                            {/* Mode Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Broadcast Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setStreamMode('broadcast')}
                                        className={`p-3 rounded-xl border text-left transition-all ${streamMode === 'broadcast' ? 'bg-primary/20 border-primary text-white' : 'bg-glass-bg border-glass-border text-gray-400'}`}
                                    >
                                        <Monitor size={20} className="mb-2" />
                                        <div className="font-bold text-sm">Solo</div>
                                    </button>
                                    <button 
                                        onClick={() => setStreamMode('random')}
                                        className={`p-3 rounded-xl border text-left transition-all ${streamMode === 'random' ? 'bg-primary/20 border-primary text-white' : 'bg-glass-bg border-glass-border text-gray-400'}`}
                                    >
                                        <Ghost size={20} className="mb-2" />
                                        <div className="font-bold text-sm">Random</div>
                                    </button>
                                    <button 
                                        onClick={() => setStreamMode('private')}
                                        className={`p-3 rounded-xl border text-left transition-all ${streamMode === 'private' ? 'bg-primary/20 border-primary text-white' : 'bg-glass-bg border-glass-border text-gray-400'}`}
                                    >
                                        <Lock size={20} className="mb-2" />
                                        <div className="font-bold text-sm">Private</div>
                                    </button>
                                    <button 
                                        onClick={() => setStreamMode('group')}
                                        className={`p-3 rounded-xl border text-left transition-all ${streamMode === 'group' ? 'bg-primary/20 border-primary text-white' : 'bg-glass-bg border-glass-border text-gray-400'}`}
                                    >
                                        <Users size={20} className="mb-2" />
                                        <div className="font-bold text-sm">Group</div>
                                    </button>
                                </div>
                            </div>

                            {/* Device Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Devices</label>
                                <DeviceSelector 
                                    selectedVideoDevice={selectedVideoDevice}
                                    selectedAudioDevice={selectedAudioDevice}
                                    onVideoDeviceChange={setSelectedVideoDevice}
                                    onAudioDeviceChange={setSelectedAudioDevice}
                                />
                            </div>

                            {/* Aspect Ratio */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Aspect Ratio</label>
                                <RatioSelector 
                                    selectedRatio={aspectRatio}
                                    onChange={setAspectRatio}
                                />
                            </div>

                            {/* Screen Share */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Content</label>
                                <button 
                                    onClick={toggleScreenShare}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${isScreenSharing ? 'bg-green-500/20 border-green-500 text-white' : 'bg-glass-bg border-glass-border text-gray-400'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Share2 size={20} />
                                        <span className="font-medium">Share Screen</span>
                                    </div>
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isScreenSharing ? 'bg-green-500' : 'bg-gray-600'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isScreenSharing ? 'translate-x-4' : ''}`} />
                                    </div>
                                </button>
                            </div>

                            <button 
                                onClick={handleStartClick}
                                className="w-full py-4 bg-primary hover:bg-primary/90 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                {streamMode === 'broadcast' ? 'Start Broadcast' : `Start ${streamMode} Call`}
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Preview Area */}
                <div className="flex-1 flex items-center justify-center bg-black relative p-4 lg:p-10">
                    <div className={`relative transition-all duration-500 ${getAspectRatioStyle()} bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10`}>
                        <video 
                            ref={videoRef}
                            autoPlay 
                            muted 
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        
                        {/* Overlay Info */}
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-sm font-medium flex items-center gap-2">
                            {isScreenSharing ? <Monitor size={14} /> : <Video size={14} />}
                            {isScreenSharing ? 'Screen Share' : 'Camera'}
                        </div>

                        {isLive && (
                            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-lg font-bold animate-pulse">
                                LIVE
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Sidebar (Visible when live) */}
                {isLive && sessionId && (
                    <div className="w-80 border-l border-glass-border bg-surface/50 backdrop-blur-md hidden lg:block z-20">
                        <LiveChat sessionId={sessionId} />
                    </div>
                )}
            </div>

            {/* Configuration Modal */}
            <GoLiveModal 
                isOpen={isConfiguring} 
                onClose={() => setIsConfiguring(false)} 
                onStart={handleStartBroadcast}
                isLoading={isLoading}
            />
        </div>
    );
}
