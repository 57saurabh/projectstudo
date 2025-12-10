import RemoteVideo from '@/components/video/RemoteVideo';
import { ParticipantPublic as Participant } from '@/lib/store/useCallStore';
import { useMemo } from 'react';

interface VideoGridProps {
    participants: Participant[];
    remoteStreams: Record<string, MediaStream>;
    remoteScreenShares?: Record<string, MediaStream>;
    localScreenStream?: MediaStream | null;
    callState: string;
}

export default function VideoGrid({
    participants,
    remoteStreams,
    remoteScreenShares = {},
    localScreenStream,
    callState
}: VideoGridProps) {

    // 1. Identify active presentation
    // Priority: Remote Screen -> Local Screen
    const activePresentation = useMemo(() => {
        const remoteSharerId = Object.keys(remoteScreenShares)[0];
        if (remoteSharerId && remoteScreenShares[remoteSharerId]) {
            return {
                type: 'remote',
                stream: remoteScreenShares[remoteSharerId],
                peerId: remoteSharerId
            };
        }
        if (localScreenStream) {
            return {
                type: 'local',
                stream: localScreenStream,
                peerId: 'local'
            };
        }
        return null;
    }, [remoteScreenShares, localScreenStream]);

    // Grid Layout Helper
    const getGridClass = () => {
        const count = participants.length;
        if (activePresentation) return 'flex flex-row gap-4 absolute bottom-24 right-4 h-32 z-20'; // Filmstrip if presenting
        if (count <= 1) return 'grid-cols-1';
        if (count <= 4) return 'grid-cols-2';
        return 'grid-cols-3';
    };

    // If Presenting, we render:
    // 1. Main Stage (Screen)
    // 2. Floating Camera Tiles (Participants)
    if (activePresentation) {
        return (
            <div className="absolute inset-0 w-full h-full bg-black flex flex-col items-center justify-center z-10">
                {/* STAGE: PRESENTATION */}
                <div className="w-full h-full p-2 flex items-center justify-center relative">
                    <video
                        ref={ref => { if (ref) ref.srcObject = activePresentation.stream }}
                        autoPlay playsInline muted // Muted usually for screen
                        className="max-w-full max-h-full object-contain rounded-xl border border-white/10 shadow-2xl"
                    />
                    <div className="absolute top-6 left-6 bg-black/70 px-4 py-2 rounded-lg text-white font-bold backdrop-blur-md border border-white/10">
                        {activePresentation.type === 'local' ? 'You are presenting' : 'Screen Share'}
                    </div>
                </div>

                {/* FILMSTRIP: CAMERAS */}
                <div className="absolute bottom-24 right-4 flex gap-4 pr-4 overflow-x-auto scrollbar-hide z-20">
                    {participants.map((participant) => {
                        // Even the presenter's camera should be shown here
                        return (
                            <div key={participant.peerId} className="relative w-48 aspect-video bg-gray-900 rounded-xl overflow-hidden border border-white/20 shadow-lg">
                                <RemoteVideo
                                    stream={remoteStreams[participant.peerId]}
                                    isMuted={false}
                                    isVideoOff={false}
                                    avatarUrl={participant.avatarUrl}
                                    displayName={participant.displayName || 'Anonymous'}
                                />
                                <div className="absolute bottom-1 left-2 text-[10px] text-white bg-black/50 px-2 rounded">
                                    {participant.displayName || 'Anonymous'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // STANDARD GRID (No Presentation)
    return (
        <div className={`absolute inset-0 w-full h-full bg-surface-hover/20 p-4 grid gap-4 ${getGridClass()} auto-rows-fr ${callState === 'proposed' ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300 z-0`}>
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
