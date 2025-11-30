import { Flag } from 'lucide-react';
import { Participant } from '@/lib/store/useCallStore';

interface MatchOverlayProps {
    callState: string;
    currentPeer: Participant | undefined;
    countdown: number;
    hasAccepted: boolean;
    onAccept: () => void;
    onSkip: () => void;
    setHasAccepted: (accepted: boolean) => void;
}

export default function MatchOverlay({
    callState,
    currentPeer,
    countdown,
    hasAccepted,
    onAccept,
    onSkip,
    setHasAccepted
}: MatchOverlayProps) {
    if (callState !== 'proposed' || !currentPeer) return null;

    return (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            {/* Snake Border Container */}
            <div className="relative p-[3px] rounded-full overflow-hidden mb-6">
                {hasAccepted && (
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,#eab308_360deg)] animate-spin" style={{ animationDuration: '2s' }} />
                )}
                <div className="relative w-32 h-32 rounded-full border-4 border-[#191121] overflow-hidden bg-gray-800 z-10">
                    <img
                        src={currentPeer.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentPeer.id}`}
                        alt="Peer Avatar"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">{currentPeer.displayName}</h3>

            <div className="flex items-center gap-3 text-white/60 text-sm mb-4">
                {currentPeer.country && (
                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                        <Flag size={12} /> {currentPeer.country}
                    </span>
                )}
                {currentPeer.language && (
                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                        <span className="text-xs">文</span> {currentPeer.language}
                    </span>
                )}
                <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-yellow-400">
                    ★ {currentPeer.reputation || 100}
                </span>
            </div>

            <p className="text-white/80 mb-8 max-w-xs text-sm line-clamp-3 italic">
                "{currentPeer.bio || "No bio available."}"
            </p>

            <div className="flex gap-4 w-full max-w-xs">
                <button
                    onClick={onSkip}
                    className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
                >
                    Skip
                </button>
                <button
                    onClick={() => {
                        setHasAccepted(true);
                        onAccept();
                    }}
                    disabled={hasAccepted}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${hasAccepted
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 cursor-wait'
                            : 'bg-[#7f19e6] text-white hover:bg-[#6d14c4] shadow-[#7f19e6]/20'
                        }`}
                >
                    {hasAccepted ? (
                        <>
                            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        'Connect Now'
                    )}
                </button>
            </div>

            {!hasAccepted && (
                <p className="text-white/40 mt-4 text-xs">
                    Auto-connecting in <span className="text-white font-bold">{countdown}s</span>
                </p>
            )}
        </div>
    );
}
