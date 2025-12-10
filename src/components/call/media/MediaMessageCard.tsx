import React from 'react';
import { Lock, Unlock, Eye, Play, FileText, Image as ImageIcon } from 'lucide-react';
import { ChatMessage } from '@/lib/store/useCallStore';

interface MediaMessageCardProps {
    message: ChatMessage;
    isMe: boolean;
    onOpen: () => void;
    onToggleLock?: () => void; // Only for unlimited received messages
}

export default function MediaMessageCard({ message, isMe, onOpen, onToggleLock }: MediaMessageCardProps) {
    const { mediaType, mediaData, viewMode, isLocked, isViewed, viewCount } = message;

    // View Once Logic
    if (viewMode === 'once') {
        const isExpired = isViewed || (isMe && viewCount && viewCount > 0);

        return (
            <div
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${isExpired ? 'bg-surface/50 border-border opacity-70' : 'bg-surface-hover border-gold/30 hover:border-gold'
                    }`}
                onClick={!isExpired ? onOpen : undefined}
            >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isExpired ? 'bg-surface' : 'bg-gold/20 text-gold'}`}>
                    {mediaType === 'image' && <ImageIcon size={20} />}
                    {mediaType === 'video' && <Play size={20} />}
                    {mediaType === 'file' && <FileText size={20} />}
                </div>
                <div className="flex flex-col">
                    <span className={`text-sm font-bold ${isExpired ? 'text-text-muted' : 'text-text-primary'}`}>
                        {mediaType === 'image' ? 'Photo' : mediaType === 'video' ? 'Video' : 'File'}
                    </span>
                    <span className="text-xs text-text-muted flex items-center gap-1">
                        {isExpired ? 'Opened' : 'View Once'}
                        {viewMode === 'once' && !isExpired && <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />}
                    </span>
                </div>
            </div>
        );
    }

    // Unlimited Logic
    const isBlur = !isMe && isLocked; // Receiver sees blur if they locked it

    return (
        <div className="relative group max-w-[250px]">
            {/* Privacy Toggle (Receiver Only) */}
            {!isMe && onToggleLock && (
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
                    className="absolute top-2 right-2 z-20 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
                >
                    {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
            )}

            {/* Content Container */}
            <div
                className="relative overflow-hidden rounded-2xl cursor-pointer border border-border"
                onClick={onOpen}
            >
                {/* Image/Video Preview */}
                {(mediaType === 'image' || mediaType === 'video') && mediaData ? (
                    <div className="relative">
                        <img
                            src={mediaType === 'video' ? undefined : (mediaData.startsWith('data:') ? mediaData : mediaData)} // simplified for base64
                            className={`w-full h-48 object-cover transition-all ${isBlur ? 'blur-xl scale-110' : ''}`}
                            alt="media"
                        />
                        {/* Fake Video Thumbnail if Video */}
                        {mediaType === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                                    <Play size={24} className="text-white fill-white" />
                                </div>
                            </div>
                        )}
                        {/* Locked Overlay */}
                        {isBlur && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 z-10">
                                <Lock size={32} className="text-text-primary/50 mb-2" />
                                <span className="text-xs font-bold text-text-primary/70">Hidden</span>
                            </div>
                        )}
                    </div>
                ) : (
                    // File Type
                    <div className="p-4 bg-surface-hover flex items-center gap-3">
                        <FileText size={32} className="text-gold" />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold truncate max-w-[150px]">{message.fileName || 'Attachment'}</span>
                            <span className="text-xs text-text-muted">Click to view</span>
                        </div>
                    </div>
                )}

                {/* Footer Metadata */}
                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                    <span className="text-[10px] text-white/80 flex items-center gap-1">
                        {isLocked && <Lock size={8} />}
                        {viewMode === 'unlimited' && <span className="px-1.5 py-0.5 bg-white/20 rounded text-[9px]">Keep</span>}
                    </span>
                    {isMe && typeof viewCount === 'number' && (
                        <span className="text-[10px] text-white/80 flex items-center gap-1">
                            <Eye size={10} /> {viewCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
