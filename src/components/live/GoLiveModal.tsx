import { useState } from 'react';
import { X, Youtube, Instagram, Globe, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GoLiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (config: { title: string; description: string; platforms: string[] }) => void;
    isLoading: boolean;
}

export default function GoLiveModal({ isOpen, onClose, onStart, isLoading }: GoLiveModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [platforms, setPlatforms] = useState<string[]>(['internal']);

    const togglePlatform = (platform: string) => {
        setPlatforms(prev => 
            prev.includes(platform) 
                ? prev.filter(p => p !== platform)
                : [...prev, platform]
        );
    };

    const handleStart = () => {
        if (!title.trim()) return alert('Please enter a title');
        if (platforms.length === 0) return alert('Select at least one platform');
        onStart({ title, description, platforms });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-surface border border-glass-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 border-b border-glass-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Go Live Settings</h2>
                            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Stream Title</label>
                                <input 
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="What are you streaming about?"
                                    className="w-full bg-glass-bg border border-glass-border rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Description (Optional)</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add some details..."
                                    rows={3}
                                    className="w-full bg-glass-bg border border-glass-border rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-300">Destinations</label>
                                <div className="grid grid-cols-1 gap-3">
                                    <button 
                                        onClick={() => togglePlatform('internal')}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                            platforms.includes('internal') 
                                                ? 'bg-primary/20 border-primary text-white' 
                                                : 'bg-glass-bg border-glass-border text-gray-400 hover:bg-glass-border'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Globe size={20} />
                                            <span className="font-medium">Internal Platform</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                            platforms.includes('internal') ? 'bg-primary border-primary' : 'border-gray-500'
                                        }`}>
                                            {platforms.includes('internal') && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => togglePlatform('youtube')}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                            platforms.includes('youtube') 
                                                ? 'bg-red-500/20 border-red-500 text-white' 
                                                : 'bg-glass-bg border-glass-border text-gray-400 hover:bg-glass-border'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Youtube size={20} className="text-red-500" />
                                            <span className="font-medium">YouTube Live</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                            platforms.includes('youtube') ? 'bg-red-500 border-red-500' : 'border-gray-500'
                                        }`}>
                                            {platforms.includes('youtube') && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => togglePlatform('instagram')}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                            platforms.includes('instagram') 
                                                ? 'bg-pink-500/20 border-pink-500 text-white' 
                                                : 'bg-glass-bg border-glass-border text-gray-400 hover:bg-glass-border'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Instagram size={20} className="text-pink-500" />
                                            <span className="font-medium">Instagram Live</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                            platforms.includes('instagram') ? 'bg-pink-500 border-pink-500' : 'border-gray-500'
                                        }`}>
                                            {platforms.includes('instagram') && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-glass-border">
                            <button 
                                onClick={handleStart}
                                disabled={isLoading}
                                className="w-full py-4 bg-primary hover:bg-primary/90 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Start Broadcast'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
