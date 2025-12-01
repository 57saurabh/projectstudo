import { StopCircle, Eye, Globe, Youtube, Instagram } from 'lucide-react';

interface LiveControlsProps {
    isLive: boolean;
    viewerCount: number;
    platforms: string[];
    onStop: () => void;
    duration?: string;
}

export default function LiveControls({ isLive, viewerCount, platforms, onStop, duration = '00:00' }: LiveControlsProps) {
    if (!isLive) return null;

    return (
        <div className="absolute top-4 left-4 right-4 z-40 flex justify-between items-start pointer-events-none">
            {/* Status Badge */}
            <div className="flex flex-col gap-2 pointer-events-auto">
                <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-lg animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full" />
                    <span className="font-bold text-sm">LIVE</span>
                    <span className="text-xs opacity-80 border-l border-white/20 pl-2 ml-1">{duration}</span>
                </div>
                
                <div className="flex gap-1">
                    {platforms.map(p => (
                        <div key={p} className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                            {p === 'internal' && <Globe size={14} />}
                            {p === 'youtube' && <Youtube size={14} className="text-red-500" />}
                            {p === 'instagram' && <Instagram size={14} className="text-pink-500" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Viewer Count & Stop Button */}
            <div className="flex items-center gap-3 pointer-events-auto">
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-white/10">
                    <Eye size={16} />
                    <span className="font-bold text-sm">{viewerCount}</span>
                </div>
                
                <button 
                    onClick={onStop}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg font-bold text-sm shadow-lg transition-colors flex items-center gap-2"
                >
                    <StopCircle size={16} />
                    End Live
                </button>
            </div>
        </div>
    );
}
