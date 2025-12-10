import { Flag, X, Check, Pause } from 'lucide-react';
import { ParticipantPublic as Participant } from '@/lib/store/useCallStore';

interface MatchOverlayProps {
    callState: string;
    currentPeer: Participant | undefined;
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
    hasAccepted,
    onAccept,
    onSkip,
    setHasAccepted,
    onAbort,
    onRetry
}: MatchOverlayProps) {

    // 1. Connecting / Spinner State (Before match or during setup)
    if (callState === 'connecting') {
        return (
            <div className="fixed inset-0 z-[100] bg-[#1a1a1a] flex flex-col items-center justify-center text-white">
                <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xl font-bold">Connecting{currentPeer ? ` to ${currentPeer.displayName}` : '...'}</p>
            </div>
        );
    }

    // 2. Safety: If no peer, showing nothing is safer than broken UI, 
    // but effectively we should show "Waiting" if state is proposed.
    if (!currentPeer) return null;

    // 3. Main MATCH UI
    return (
        <div className="fixed inset-0 z-[100] bg-[#1a1a1a] flex flex-col items-center justify-center p-4">

            <div className="flex flex-col md:flex-row items-center gap-8 animate-in fade-in zoom-in-95 duration-300">

                {/* CENTER: Main Photo Card */}
                <div className="relative w-[320px] h-[320px] md:w-[420px] md:h-[420px] lg:w-[480px] lg:h-[480px] rounded-[2.5rem] border-[6px] border-yellow-400 overflow-hidden bg-black shadow-2xl shrink-0">
                    <img
                        src={currentPeer.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentPeer.peerId}`}
                        alt="Peer Avatar"
                        className="w-full h-full object-cover"
                    />
                    {/* Subtle gradient for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* RIGHT: Info Panel */}
                <div className="flex flex-col gap-4 text-white/90 min-w-[220px] max-w-[300px] p-2">

                    {/* Display Name */}
                    <h2 className="text-3xl font-bold text-white">{currentPeer.displayName || 'Unknown'}</h2>

                    {/* Country */}
                    <div className="flex items-center gap-3 text-lg bg-white/5 p-3 rounded-xl border border-white/10">
                        <span className="text-2xl">🇺🇸</span> {/* TODO: Map country code to flag */}
                        <span className="font-bold tracking-wide">{currentPeer.country || 'Global'}</span>
                    </div>

                    {/* Language */}
                    <div className="flex items-center gap-3 text-sm text-white/80 bg-white/5 p-3 rounded-xl border border-white/10">
                        <span>I speak:</span>
                        <span className="text-lg">🇬🇧</span> {/* TODO: Map language */}
                        <span className="font-medium">{currentPeer.language || 'English'}</span>
                    </div>

                    {/* Topics */}
                    <div className="flex flex-col gap-2 text-sm text-white/80 bg-white/5 p-3 rounded-xl border border-white/10">
                        <span className="text-white/50 text-xs uppercase tracking-wider font-bold">Interests</span>
                        <div className="flex flex-wrap gap-2">
                            {currentPeer.interests && currentPeer.interests.length > 0 ? (
                                currentPeer.interests.slice(0, 5).map((tag: string, i: number) => (
                                    <span key={i} className="px-2 py-1 rounded-md bg-yellow-400/20 text-yellow-400 text-xs font-bold">
                                        {tag}
                                    </span>
                                ))
                            ) : (
                                <span className="text-white/50 italic">No specific topics</span>
                            )}
                        </div>
                    </div>

                    {/* Bio Snippet */}
                    {currentPeer.bio && (
                        <p className="text-white/60 text-sm italic mt-2 line-clamp-3">
                            "{currentPeer.bio}"
                        </p>
                    )}
                </div>
            </div>

            {/* BOTTOM: Action Bar */}
            <div className="flex items-center gap-6 mt-12 md:gap-12">

                {/* REPORT */}
                <button
                    onClick={() => console.log('Report user')}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white/40 hover:text-orange-500 transition-all"
                    title="Report"
                >
                    <Flag size={20} />
                </button>

                {/* SKIP (Red) */}
                <button
                    onClick={onSkip}
                    className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-lg shadow-red-500/10"
                    title="Skip"
                >
                    <X size={32} strokeWidth={3} />
                </button>

                {/* ACCEPT (Yellow) */}
                <button
                    onClick={() => {
                        setHasAccepted?.(true);
                        onAccept?.();
                    }}
                    disabled={hasAccepted}
                    className={`w-24 h-24 flex items-center justify-center rounded-full bg-yellow-400 text-black shadow-xl shadow-yellow-400/20 transition-all transform hover:scale-105 active:scale-95 ${hasAccepted ? 'opacity-90 cursor-wait' : 'hover:bg-yellow-300'}`}
                    title="Accept Match"
                >
                    {hasAccepted ? (
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Waiting</span>
                        </div>
                    ) : (
                        <Check size={48} strokeWidth={4} />
                    )}
                </button>

                {/* PAUSE */}
                <button
                    onClick={() => console.log('Pause matchmaking')}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white/40 hover:text-white transition-all"
                    title="Pause"
                >
                    <Pause size={20} />
                </button>
            </div>

            {/* Helper Text */}
            <div className="mt-8 text-white/20 text-xs font-medium uppercase tracking-widest">
                {hasAccepted ? 'Waiting for partner...' : 'Accept to start video'}
            </div>

        </div>
    );
}
