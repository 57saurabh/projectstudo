'use client';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useCallStore } from '@/lib/store/useCallStore';

export default function LocalVideo() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { localStream, isVideoOff } = useCallStore();
    const { user } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (videoEl && localStream) {
            videoEl.srcObject = localStream;
            videoEl.play().catch(e => {
                if (e.name === 'AbortError' || e.message?.includes('interrupted')) {
                    // Silently ignore
                } else {
                    console.error('Local video play error:', e);
                }
            });
        }

        return () => {
            if (videoEl) {
                videoEl.srcObject = null;
            }
        };
    }, [localStream]);

    return (
        <div className="relative w-full h-full bg-[#2a2a2a] rounded-xl overflow-hidden border-2 border-white/20 shadow-lg group">
            {localStream && localStream.active && !isVideoOff ? (
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="w-full h-full object-cover transform -scale-x-100"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#7f19e6] to-blue-500 p-[2px]">
                        <div className="w-full h-full rounded-full bg-[#191121] flex items-center justify-center overflow-hidden">
                            <span className="font-bold text-lg text-white">{user?.displayName?.[0] || 'U'}</span>
                        </div>
                    </div>
                </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white/80 backdrop-blur-sm">
                You
            </div>
        </div>
    );
}
