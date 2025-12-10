import React, { useEffect, useState } from 'react';
import { X, Lock, Unlock, Clock, Download, Share2 } from 'lucide-react';
import { ChatMessage } from '@/lib/store/useCallStore';

interface MediaViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: ChatMessage | null;
    isMe: boolean;
    onLockToggle?: (messageId: string, isLocked: boolean) => void;
    onViewed?: (messageId: string) => void;
}

export default function MediaViewerModal({ isOpen, onClose, message, isMe, onLockToggle, onViewed }: MediaViewerModalProps) {
    const [isLockedLocal, setIsLockedLocal] = useState(false);

    useEffect(() => {
        if (message) {
            setIsLockedLocal(message.isLocked || false);
        }
    }, [message]);

    if (!isOpen || !message) return null;

    const { mediaType, mediaData, viewMode, senderName, timestamp } = message;
    const isViewOnce = viewMode === 'once';
    const isBlur = !isMe && isLockedLocal && viewMode === 'unlimited';

    const handleClose = () => {
        onClose();
        if (isViewOnce && !isMe && onViewed) {
            // For view once, if WE received it and just viewed it, mark it.
            // Ideally we use a real ID. Fallback to timestamp if missing.
            const msgId = (message as any)._id || message.timestamp.toString();
            onViewed(msgId);
        }
    };

    const toggleLock = () => {
        if (onLockToggle && message.chatId) { // Ensure we have ID
            // In real app we use message._id or similar. ChatMessage interface might lack _id if not from DB properly.
            // For now assuming we pass valid ID via props or store.
            const newLockedState = !isLockedLocal;
            setIsLockedLocal(newLockedState);
            onLockToggle(message.timestamp.toString(), newLockedState); // Using timestamp as temp ID if needed
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
                <div className="flex flex-col">
                    <span className="text-white font-bold text-lg">{senderName}</span>
                    <span className="text-white/60 text-xs">
                        {new Date(timestamp).toLocaleString()} • {isViewOnce ? 'View Once' : 'Keep in Chat'}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Receiver Privacy Toggle for Unlimited */}
                    {!isMe && !isViewOnce && (
                        <button
                            onClick={toggleLock}
                            className={`p-2 rounded-full transition-all ${isLockedLocal ? 'bg-gold text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            title={isLockedLocal ? "Unlock media" : "Lock media (Hide)"}
                        >
                            {isLockedLocal ? <Lock size={20} /> : <Unlock size={20} />}
                        </button>
                    )}

                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
                {isBlur ? (
                    <div className="flex flex-col items-center gap-4">
                        <Lock size={64} className="text-white/20" />
                        <p className="text-white/50 text-sm font-medium">This media is hidden by privacy settings</p>
                        <button
                            onClick={toggleLock}
                            className="px-6 py-2 bg-gold text-black rounded-full font-bold hover:bg-gold-hover transition-all"
                        >
                            Unlock to View
                        </button>
                    </div>
                ) : (
                    <>
                        {mediaType === 'image' && mediaData && (
                            <img
                                src={mediaData}
                                className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                                alt="Shared media"
                            />
                        )}
                        {mediaType === 'video' && mediaData && (
                            <div className="w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
                                <video
                                    src={mediaData}
                                    controls
                                    autoPlay
                                    className="w-full h-full"
                                />
                            </div>
                        )}
                        {mediaType === 'file' && (
                            <div className="p-12 bg-white/10 rounded-3xl flex flex-col items-center gap-6 border border-white/10">
                                <div className="w-24 h-24 bg-gold/20 rounded-full flex items-center justify-center text-gold">
                                    <Download size={48} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-white font-bold text-xl mb-1">{message.fileName || 'Document'}</h3>
                                    <p className="text-white/50">Shared File</p>
                                </div>
                                <button className="px-8 py-3 bg-gold text-black rounded-xl font-bold hover:bg-gold-hover transition-all flex items-center gap-2">
                                    <Download size={20} /> Download
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer Warning for View Once */}
            {isViewOnce && (
                <div className="p-4 bg-gradient-to-t from-red-500/20 to-transparent flex justify-center">
                    <div className="bg-red-500/20 border border-red-500/50 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                        <Clock size={16} className="text-red-400" />
                        <span className="text-red-200 text-xs font-bold">Heads up! This photo will disappear after you close it.</span>
                    </div>
                </div>
            )}
        </div>
    );
}
