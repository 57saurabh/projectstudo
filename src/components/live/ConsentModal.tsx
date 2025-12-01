import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, X } from 'lucide-react';

interface ConsentModalProps {
    isOpen: boolean;
    hostName: string;
    platforms: string[];
    onAccept: () => void;
    onDecline: () => void;
}

export default function ConsentModal({ isOpen, hostName, platforms, onAccept, onDecline }: ConsentModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-surface border border-glass-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                    >
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-500">
                                <AlertTriangle size={32} />
                            </div>
                            
                            <h2 className="text-2xl font-bold text-white mb-2">Live Stream Request</h2>
                            <p className="text-gray-300 mb-6">
                                <span className="font-bold text-white">{hostName}</span> wants to stream this call live to:
                            </p>
                            
                            <div className="flex flex-wrap gap-2 justify-center mb-8">
                                {platforms.map(p => (
                                    <span key={p} className="px-3 py-1 bg-glass-bg border border-glass-border rounded-full text-sm capitalize text-white">
                                        {p}
                                    </span>
                                ))}
                            </div>

                            <p className="text-sm text-gray-400 mb-8">
                                If you accept, your video and audio will be broadcast publicly. If you decline, the stream will not start.
                            </p>

                            <div className="flex gap-4">
                                <button 
                                    onClick={onDecline}
                                    className="flex-1 py-3 bg-surface border border-glass-border text-white rounded-xl font-bold hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-all flex items-center justify-center gap-2"
                                >
                                    <X size={20} />
                                    Decline
                                </button>
                                <button 
                                    onClick={onAccept}
                                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                                >
                                    <Check size={20} />
                                    Accept
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
