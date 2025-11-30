'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import LocalVideo from '@/components/video/LocalVideo';
import { ScanFace, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useCallStore } from '@/lib/store/useCallStore';
import { useWebRTC } from '@/lib/webrtc/useWebRTC';

export default function PreCheckPage() {
    const router = useRouter();
    // Initialize WebRTC (requests permissions and starts stream)
    useWebRTC();

    const { localStream, setLocalStream, setMediaError } = useCallStore();
    const [isScanning, setIsScanning] = useState(true);
    const [faceDetected, setFaceDetected] = useState(false);
    const [checkStatus, setCheckStatus] = useState<'success' | 'failed' | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const scanningRef = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Sync localStream to hidden video element for capture
    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        let mounted = true;
        let timeoutId: NodeJS.Timeout;

        const scanFace = async () => {
            if (!localStream || !mounted || scanningRef.current) return;

            try {
                scanningRef.current = true;

                // Ensure stream is still active
                if (!localStream.active) return;

                const videoEl = videoRef.current;
                const canvasEl = canvasRef.current;

                if (!videoEl || !canvasEl) return;

                // Check if video is ready
                if (videoEl.readyState >= 2) { // HAVE_CURRENT_DATA or better
                    // Set canvas dimensions to match video
                    if (canvasEl.width !== videoEl.videoWidth || canvasEl.height !== videoEl.videoHeight) {
                        canvasEl.width = videoEl.videoWidth;
                        canvasEl.height = videoEl.videoHeight;
                    }

                    const ctx = canvasEl.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

                        // Convert to blob
                        const blob = await new Promise<Blob | null>(resolve => canvasEl.toBlob(resolve, 'image/jpeg', 0.8));

                        if (blob) {
                            console.log('Sending face scan blob, size:', blob.size); // Debug log

                            const formData = new FormData();
                            formData.append('file', blob, 'capture.jpg');

                            const response = await axios.post('/api/proxy/face', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                                timeout: 5000 // 5s timeout
                            });

                            console.log('Face detection response:', response.data); // Debug log

                            if (mounted) {
                                const detected = response.data.faceDetected;
                                setFaceDetected(detected);
                                setCheckStatus(detected ? 'success' : 'failed');
                                setStatusMessage(detected ? 'Face detected! You are ready.' : 'No face detected. Stay in frame.');
                            }
                        } else {
                            console.warn('Failed to create blob from canvas');
                        }
                    }
                } else {
                    console.log('Video not ready, state:', videoEl.readyState); // Debug log
                    // Try to play if paused
                    if (videoEl.paused) {
                        videoEl.play().catch(e => console.error('Auto-play failed:', e));
                    }
                }
            } catch (error) {
                console.error('Face scan error:', error);
            } finally {
                scanningRef.current = false;
                if (mounted) {
                    timeoutId = setTimeout(scanFace, 1000); // Scan every 1 second
                }
            }
        };

        if (localStream) {
            scanFace();
        }

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
        };
    }, [localStream]);

    const handleStartMatching = () => {
        if (faceDetected) {
            router.push('/call/random');
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#191121] p-6">
            {/* Hidden Video and Canvas for Capture */}
            <video ref={videoRef} autoPlay muted playsInline className="hidden" />
            <canvas ref={canvasRef} className="hidden" />

            <div className="w-full max-w-md flex flex-col gap-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Camera Check</h1>
                    <p className="text-white/60">We verify your face continuously.</p>
                </div>

                <div className="relative aspect-[4/3] w-full bg-black rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
                    <LocalVideo />

                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className={`absolute inset-0 border-4 transition-colors duration-300 ${faceDetected ? 'border-green-500/50' : 'border-red-500/50'
                            }`} />

                        {!faceDetected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ScanFace size={64} className="text-white/50 animate-pulse" />
                            </div>
                        )}
                    </div>

                    {/* Status Badge */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
                        {faceDetected ? (
                            <>
                                <CheckCircle size={16} className="text-green-500" />
                                <span className="text-white text-sm font-medium">Face Detected</span>
                            </>
                        ) : (
                            <>
                                <XCircle size={16} className="text-red-500" />
                                <span className="text-white text-sm font-medium">No Face</span>
                            </>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleStartMatching}
                    disabled={!faceDetected}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${faceDetected
                        ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
                        : 'bg-gray-700 text-white/30 cursor-not-allowed'
                        }`}
                >
                    Start Matching <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
}
