import { Flag } from 'lucide-react';
import { ParticipantPublic as Participant } from '@/lib/store/useCallStore';

interface MatchOverlayProps {
    callState: string;
    currentPeer: Participant | undefined;
    countdown?: number;
    hasAccepted?: boolean;
    onAccept?: () => void;
    onSkip?: () => void;
    setHasAccepted?: (accepted: boolean) => void;
    onAbort?: () => void;
    onRetry?: () => void;
}

export default function MatchOverlay({
    callState,
    currentPeer,
    countdown,
    hasAccepted,
    onAccept,
    onSkip,
    setHasAccepted,
    onAbort,
    onRetry
}: MatchOverlayProps) {


    if (callState === 'connecting') {
        return (
            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-[#7f19e6] border-t-transparent rounded-full mb-4"></div>
                <h3 className="text-xl font-bold text-white mb-2">Connecting{currentPeer ? ` to ${currentPeer.displayName}` : '...'}</h3>

                {currentPeer && (
                    <div className="flex flex-col items-center mb-6">
                        <img
                            src={currentPeer.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentPeer.peerId}`}
                            alt="Avatar"
                            className="w-16 h-16 rounded-full border-2 border-white/20 mb-2"
                        />
                        <p className="text-white/50 text-sm">{currentPeer.bio || 'No bio available'}</p>
                    </div>
                )}

                <p className="text-white/50 text-sm mb-6">Establishing secure connection</p>

                {/* Manual Retry / Cancel if taking too long */}
                <button
                    onClick={() => {
                        onAbort?.();
                        onRetry?.();
                    }}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors text-sm"
                >
                    Cancel & Retry
                </button>
            </div>
        );
    }

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
                        src={currentPeer.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentPeer.peerId}`}
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
                        console.log('[MatchOverlay] Connect button clicked');
                        setHasAccepted?.(true);
                        onAccept?.();
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

            {!hasAccepted && countdown !== undefined && (
                <p className="text-white/40 mt-4 text-xs">
                    Auto-connecting in <span className="text-white font-bold">{countdown}s</span>
                </p>
            )}
        </div>
    );
}
