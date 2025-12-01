import { Participant } from '@/lib/store/useCallStore';

interface ConnectingOverlayProps {
    callState: string;
    currentPeer?: Participant;
    onAbort: () => void;
    onRetry: () => void;
}

export default function ConnectingOverlay({ callState, currentPeer, onAbort, onRetry }: ConnectingOverlayProps) {
    if (callState !== 'connecting') return null;

    return (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-[#7f19e6] border-t-transparent rounded-full mb-4"></div>
            <h3 className="text-xl font-bold text-white mb-2">Connecting{currentPeer ? ` to ${currentPeer.displayName}` : '...'}</h3>

            {currentPeer && (
                <div className="flex flex-col items-center mb-6">
                    <img
                        src={currentPeer.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentPeer.id}`}
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
                    onAbort();
                    onRetry();
                }}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors text-sm"
            >
                Cancel & Retry
            </button>
        </div>
    );
}
