import React from 'react';

interface VideoGridProps {
    peers: string[];
}

export const VideoGrid: React.FC<VideoGridProps> = ({ peers }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 w-full h-full">
            {/* Local User */}
            <div className="relative bg-surface rounded-3xl overflow-hidden border-2 border-accent shadow-neon-green aspect-video">
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-sm font-bold">
                    You
                </div>
                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
                    Camera Feed
                </div>
            </div>

            {/* Remote Peers */}
            {peers.map((peer) => (
                <div key={peer} className="relative bg-surface rounded-3xl overflow-hidden border border-glass-border aspect-video">
                    <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-sm font-bold">
                        User {peer.slice(0, 4)}
                    </div>
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-600">
                        Connecting...
                    </div>
                </div>
            ))}
        </div>
    );
};
