'use client';
import { useEffect, useRef } from 'react';

interface RemoteVideoProps {
    stream: MediaStream | null;
    isMuted: boolean;
    isVideoOff: boolean;
    avatarUrl?: string;
    displayName: string;
}

export default function RemoteVideo({ stream, isMuted, isVideoOff, avatarUrl, displayName }: RemoteVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (videoEl && stream) {
            videoEl.srcObject = stream;
            videoEl.play().catch(e => {
                if (e.name === 'AbortError') {
                    // Ignore abort errors caused by component unmounting or source changing
                    console.log('Remote video play aborted (harmless)');
                } else {
                    console.error('Remote video play error:', e);
                }
            });
        }

        return () => {
            if (videoEl) {
                videoEl.srcObject = null;
            }
        };
    }, [stream]);

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
            {stream && !isVideoOff ? (
                <video
                    ref={videoRef}
                    playsInline
                    className="w-full h-full object-cover"
                />
            ) : (
                // Avatar Fallback (Chatroulette style)
                <div className="flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-full border-4 border-white/10 overflow-hidden bg-gray-800">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/50">
                                {displayName?.[0] || '?'}
                            </div>
                        )}
                    </div>
                    <p className="text-white/50 text-sm">Camera is off</p>
                </div>
            )}

            {/* Mute Indicator */}
            {isMuted && (
                <div className="absolute top-4 right-4 bg-red-500/80 p-2 rounded-full backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M2 2l20 20M12 12v3M8 8v6M19.07 10.93a10 10 0 0 1 .63 2.27 10 10 0 0 1-1.4 5.33M2 12a10 10 0 0 0 4.13 7.87" /></svg>
                </div>
            )}
        </div>
    );
}
