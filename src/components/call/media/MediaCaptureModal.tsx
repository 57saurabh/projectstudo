import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Send, X, Video, Image as ImageIcon, CheckCircle2, Eye, Infinity as InfinityIcon } from 'lucide-react';

interface MediaCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: { type: 'image' | 'video' | 'file', content: string, viewMode: 'once' | 'unlimited', caption: string }) => void;
}

export default function MediaCaptureModal({ isOpen, onClose, onSend }: MediaCaptureModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'once' | 'unlimited'>('unlimited');
    const [caption, setCaption] = useState('');

    // Init Camera
    useEffect(() => {
        if (isOpen && !capturedImage) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera failed", err);
        }
    };

    const stopCamera = () => {
        stream?.getTracks().forEach(t => t.stop());
        setStream(null);
    };

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(dataUrl);
            stopCamera();
        }
    };

    const handleSend = () => {
        if (capturedImage) {
            onSend({
                type: 'image',
                content: capturedImage,
                viewMode,
                caption
            });
            reset();
            onClose();
        }
    };

    const reset = () => {
        setCapturedImage(null);
        setCaption('');
        setViewMode('unlimited');
        startCamera();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
            {/* Header */}
            <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
                    <X size={24} />
                </button>
                <span className="text-white font-bold ml-4">{capturedImage ? 'Review' : 'Camera'}</span>
                <div className="w-10" />
            </div>

            {/* Main Content */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
                {!capturedImage ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <img src={capturedImage} className="w-full h-full object-contain" alt="preview" />
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 inset-x-0 p-6 pb-12 flex flex-col gap-4 bg-gradient-to-t from-black via-black/80 to-transparent">

                {capturedImage && (
                    <>
                        {/* View Mode Selector */}
                        <div className="flex justify-center mb-2">
                            <div className="flex bg-white/20 backdrop-blur-lg rounded-full p-1 border border-white/10">
                                <button
                                    onClick={() => setViewMode('once')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${viewMode === 'once' ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
                                >
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full border border-current text-[10px]">1</span>
                                    View Once
                                </button>
                                <button
                                    onClick={() => setViewMode('unlimited')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${viewMode === 'unlimited' ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
                                >
                                    <InfinityIcon size={16} />
                                    Keep in Chat
                                </button>
                            </div>
                        </div>

                        {/* Caption Input */}
                        <div className="relative">
                            <input
                                type="text"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Add a caption..."
                                className="w-full bg-white/10 backdrop-blur-md rounded-full px-6 py-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gold border border-white/10 text-center"
                            />
                        </div>
                    </>
                )}

                <div className="flex items-center justify-between mt-4 px-8">
                    {/* Left Action */}
                    {!capturedImage ? (
                        <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white">
                            <ImageIcon size={24} />
                        </button>
                    ) : (
                        <button onClick={reset} className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white">
                            <RefreshCw size={24} />
                        </button>
                    )}

                    {/* Center Action (Shutter / Send) */}
                    {!capturedImage ? (
                        <button
                            onClick={takePhoto}
                            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 transition-transform"
                        >
                            <div className="w-16 h-16 bg-white rounded-full" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSend}
                            className="w-20 h-20 rounded-full bg-gold text-black flex items-center justify-center hover:bg-gold-hover shadow-lg shadow-gold/20 transition-transform hover:scale-105"
                        >
                            <Send size={32} />
                        </button>
                    )}

                    {/* Right Action (Spacer or Flip - Flip not impl yet) */}
                    <div className="w-14" />
                </div>
            </div>
        </div>
    );
}
