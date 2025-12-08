import RemoteVideo from '@/components/video/RemoteVideo';
import { ParticipantPublic as Participant } from '@/lib/store/useCallStore';

interface VideoGridProps {
    participants: Participant[];
    remoteStreams: Record<string, MediaStream>;
    callState: string;
}

export default function VideoGrid({ participants, remoteStreams, callState }: VideoGridProps) {
    const getGridClass = () => {
        const count = participants.length;
        if (count <= 1) return 'grid-cols-1';
        if (count <= 4) return 'grid-cols-2';
        return 'grid-cols-3';
    };

    return (
        <div className={`absolute inset-0 w-full h-full bg-surface-hover/20 p-4 grid gap-4 ${getGridClass()} auto-rows-fr ${callState === 'proposed' ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
            {participants.length > 0 ? (
                participants.map((participant) => (
                    <div key={participant.peerId} className="relative w-full h-full bg-surface rounded-2xl overflow-hidden flex items-center justify-center border border-border group hover:border-gold/50 transition-colors">
                        {/* Remote Video Element */}
                        <RemoteVideo
                            stream={remoteStreams[participant.peerId]}
                            isMuted={false}
                            isVideoOff={false}
                            avatarUrl={participant.avatarUrl}
                            displayName={participant.displayName || 'Anonymous'}
                        />

                        {/* Reputation Badge */}
                        {participant.reputation !== undefined && (
                            <div className="absolute top-4 left-4 bg-surface/80 backdrop-blur-md px-3 py-1 rounded-full border border-gold/50 flex items-center gap-2 z-20 shadow-gold-glow">
                                <span className="text-gold text-xs font-bold">★ {participant.reputation}</span>
                            </div>
                        )}

                        <div className="absolute bottom-4 left-4 text-white font-bold tracking-wide z-20 bg-surface/60 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">
                            {participant.displayName}
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="animate-spin w-12 h-12 border-4 border-gold border-t-transparent rounded-full shadow-gold-glow"></div>
                    <p className="text-text-muted font-medium animate-pulse">Searching for someone specifically for you...</p>
                </div>
            )}
        </div>
    );
}
