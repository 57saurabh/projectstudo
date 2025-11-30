import RemoteVideo from '@/components/video/RemoteVideo';
import { Participant } from '@/lib/store/useCallStore';

interface VideoGridProps {
    participants: Participant[];
    remoteStreams: Record<string, MediaStream>;
    callState: string;
}

export default function VideoGrid({ participants, remoteStreams, callState }: VideoGridProps) {
    return (
        <div className={`absolute inset-0 w-full h-full bg-[#1a1a1a] p-4 grid gap-4 ${participants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} ${callState === 'proposed' ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
            {participants.length > 0 ? (
                participants.map((participant) => (
                    <div key={participant.id} className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center border border-white/10 group">
                        {/* Remote Video Element */}
                        <RemoteVideo
                            stream={remoteStreams[participant.id]}
                            isMuted={participant.isMuted}
                            isVideoOff={participant.isVideoOff}
                            avatarUrl={participant.avatarUrl}
                            displayName={participant.displayName}
                        />

                        {/* Reputation Badge */}
                        {participant.reputation !== undefined && (
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-500/30 flex items-center gap-2 z-20">
                                <span className="text-yellow-400 text-xs font-bold">★ {participant.reputation}</span>
                            </div>
                        )}

                        <div className="absolute bottom-4 left-4 text-white font-medium z-20 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                            {participant.displayName}
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="animate-spin w-8 h-8 border-4 border-[#7f19e6] border-t-transparent rounded-full"></div>
                    <p className="text-white/50">Searching for a match...</p>
                </div>
            )}
        </div>
    );
}
