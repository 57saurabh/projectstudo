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

    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 400, height: 400, facingMode: 'user' },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setError(null);
        } catch (err: any) {
            console.error("Error accessing webcam:", err);
            setError("Could not access camera. Please allow camera permissions.");
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    const capture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                // Set canvas dimensions to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw video frame to canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Get base64 image
                const imageSrc = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedImage(imageSrc);
                stopCamera(); // Stop stream after capture
            }
        }
    };

    const retake = () => {
        setCapturedImage(null);
        startCamera();
    };

    const confirm = () => {
        if (capturedImage) {
            onCapture(capturedImage);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4 bg-black/20 rounded-xl border border-white/10">
            <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-[#7f19e6] bg-black">
                {!capturedImage ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                    />
                ) : (
                    <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-center p-4">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-4">
                {!capturedImage ? (
                    <>
                        <button
                            onClick={onCancel}
                            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                            title="Cancel"
                        >
                            <X size={24} />
                        </button>
                        <button
                            onClick={capture}
                            className="p-3 rounded-full bg-[#7f19e6] text-white hover:bg-[#6d14c4] transition-colors shadow-lg shadow-[#7f19e6]/20"
                            title="Capture Photo"
                        >
                            <Camera size={24} />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={retake}
                            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                            title="Retake"
                        >
                            <RefreshCw size={24} />
                        </button>
                        <button
                            onClick={confirm}
                            className="p-3 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                            title="Confirm"
                        >
                            <Check size={24} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default WebcamCapture;
