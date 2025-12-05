import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, Check, X } from 'lucide-react';

interface WebcamCaptureProps {
    onCapture: (imageSrc: string) => void;
    onCancel: () => void;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [timer, setTimer] = useState(3);
    const [countdown, setCountdown] = useState<number | null>(null);

    useEffect(() => {
        let mounted = true;

        const initCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, facingMode: 'user' },
                    audio: false
                });

                if (mounted) {
                    setStream(mediaStream);
                    setError(null);
                } else {
                    mediaStream.getTracks().forEach(track => track.stop());
                }
            } catch (err: any) {
                console.error("Error accessing webcam:", err);
                if (mounted) {
                    setError("Could not access camera. Please allow camera permissions.");
                }
            }
        };

        initCamera();

        return () => {
            mounted = false;
            // Cleanup handled by the stream state change or unmount
        };
    }, []);

    // Separate effect to handle stream attachment to video element
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
    }, [stream]);

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    useEffect(() => {
        if (countdown === null) return;

        if (countdown > 0) {
            const timeout = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timeout);
        } else {
            // Countdown finished, capture!
            performCapture();
            setCountdown(null);
        }
    }, [countdown]);

    const performCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.translate(canvas.width, 0);
                context.scale(-1, 1); // Mirror
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageSrc = canvas.toDataURL('image/jpeg', 0.9);
                setCapturedImage(imageSrc);
                // Don't stop camera immediately if we want to retake quickly, 
                // but usually we stop to show the captured image clearly.
                // Let's keep camera running in background or stop it?
                // The requirement says "after out will show the live camrea respone on screen" - wait, 
                // "after out will show the live camrea respone on screen" might mean "after capture, show result"?
                // Or "while capturing show live response"?
                // Assuming standard flow: Live Preview -> Capture -> Static Preview -> Confirm/Retake.
                // Stop stream after capture
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            }
        }
    };

    const startCaptureFlow = () => {
        setCountdown(timer);
    };

    const retake = () => {
        setCapturedImage(null);
        // Re-initialize camera
        navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: 'user' },
            audio: false
        }).then(mediaStream => {
            setStream(mediaStream);
            setError(null);
        }).catch(err => {
            console.error("Error accessing webcam:", err);
            setError("Could not access camera. Please allow camera permissions.");
        });
    };

    const confirm = () => {
        if (capturedImage) {
            onCapture(capturedImage);
        }
    };

    const adjustTimer = (delta: number) => {
        setTimer(prev => Math.max(3, prev + delta)); // Min 3 seconds
    };

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
            {/* Main Content Area */}
            <div className="relative flex-1 w-full h-full overflow-hidden">
                {!capturedImage ? (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                        {/* Countdown Overlay */}
                        {countdown !== null && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10 transition-all duration-300">
                                <span className="text-[180px] font-black text-gold drop-shadow-[0_0_50px_rgba(255,215,0,0.5)] animate-bounce">
                                    {countdown === 0 ? '😊' : countdown}
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full h-full object-cover" // Already mirrored from canvas
                    />
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white p-4">
                        <p className="text-xl font-bold text-danger bg-danger/10 px-6 py-4 rounded-3xl border border-danger/30">{error}</p>
                    </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col items-center gap-8">

                    {!capturedImage && countdown === null && (
                        <div className="flex items-center gap-4 bg-black/60 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 shadow-lg">
                            <span className="text-white font-bold uppercase tracking-wider text-sm">Timer:</span>
                            <button
                                onClick={() => adjustTimer(-1)}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-gold hover:text-white text-white/80 transition-all active:scale-95"
                            >
                                -
                            </button>
                            <span className="text-2xl font-black text-gold w-12 text-center">{timer}s</span>
                            <button
                                onClick={() => adjustTimer(1)}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-gold hover:text-white text-white/80 transition-all active:scale-95"
                            >
                                +
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-10">
                        {!capturedImage ? (
                            <>
                                <button
                                    onClick={onCancel}
                                    className="p-5 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-danger transition-all backdrop-blur-md active:scale-95 border border-white/5 hover:border-danger/30"
                                    title="Cancel"
                                >
                                    <X size={32} />
                                </button>
                                <button
                                    onClick={startCaptureFlow}
                                    disabled={countdown !== null}
                                    className={`p-8 rounded-full bg-gold text-white hover:bg-gold-hover transition-all shadow-[0_0_30px_rgba(255,215,0,0.4)] hover:shadow-[0_0_50px_rgba(255,215,0,0.6)] transform hover:scale-110 active:scale-95 border-4 border-white/20 ${countdown !== null ? 'opacity-50 cursor-not-allowed contrast-50' : ''}`}
                                    title="Capture Photo"
                                >
                                    <Camera size={48} fill="currentColor" />
                                </button>
                                <div className="w-[72px]" /> {/* Spacer for balance */}
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={retake}
                                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md font-bold text-lg hover:scale-105 active:scale-95 border border-white/10"
                                >
                                    <RefreshCw size={24} />
                                    Retake
                                </button>
                                <button
                                    onClick={confirm}
                                    className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-gold text-white hover:bg-gold-hover transition-all shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:shadow-[0_0_40px_rgba(255,215,0,0.5)] font-black text-xl hover:scale-105 active:scale-95"
                                >
                                    <Check size={28} />
                                    Use Photo
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default WebcamCapture;
