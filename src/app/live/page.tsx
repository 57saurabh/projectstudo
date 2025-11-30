'use client';

import { Radio, Video, Mic, Share2 } from 'lucide-react';

export default function LivePage() {
    return (
        <div className="min-h-screen bg-[#f7f6f8] dark:bg-[#191121] text-white p-6 lg:p-10 flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full text-center">
                <div className="w-24 h-24 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-8 text-teal-500 animate-pulse">
                    <Radio size={48} />
                </div>

                <h1 className="text-4xl font-bold mb-4">Go Live</h1>
                <p className="text-white/50 text-lg mb-12">
                    Broadcast yourself to the world. Your followers will be notified when you start streaming.
                </p>

                <div className="bg-[#141118] border border-white/10 rounded-3xl p-8 mb-8">
                    <div className="aspect-video bg-black/40 rounded-2xl mb-6 flex items-center justify-center border border-white/5">
                        <p className="text-white/30">Camera Preview</p>
                    </div>

                    <div className="flex items-center justify-center gap-4 mb-8">
                        <button className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                            <Video size={24} />
                        </button>
                        <button className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                            <Mic size={24} />
                        </button>
                        <button className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                            <Share2 size={24} />
                        </button>
                    </div>

                    <button className="w-full py-4 bg-teal-600 hover:bg-teal-500 rounded-xl font-bold text-lg transition-colors shadow-[0_0_30px_rgba(20,184,166,0.3)]">
                        Start Broadcast
                    </button>
                </div>
            </div>
        </div>
    );
}
