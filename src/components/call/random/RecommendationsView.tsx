import React from 'react';
import { UserPlus, X } from 'lucide-react';

interface RecommendedUser {
    peerId: string; // Socket ID
    displayName: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
}

interface RecommendationsViewProps {
    recommendations: RecommendedUser[];
    onConnect: (peerId: string) => void;
    onClose: () => void;
    title?: string;
}

const RecommendationsView: React.FC<RecommendationsViewProps> = ({ recommendations, onConnect, onClose, title = "Recommended for you" }) => {
    if (recommendations.length === 0) return null;

    return (
        <div className="absolute top-4 left-4 right-4 z-30 bg-surface/95 backdrop-blur-sm border border-gold/30 rounded-2xl p-4 shadow-xl animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-gold font-bold text-lg flex items-center gap-2">
                    <UserPlus size={20} />
                    {title}
                </h3>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {recommendations.map(user => (
                    <div key={user.peerId} className="flex flex-col items-center gap-2 min-w-[100px] p-3 rounded-xl bg-black/40 border border-white/5 hover:border-gold/50 transition-all">
                        <div className="w-16 h-16 rounded-full bg-surface-hover border-2 border-gold/20 p-1">
                            <img
                                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.peerId}`}
                                alt={user.displayName}
                                className="w-full h-full rounded-full object-cover bg-background"
                            />
                        </div>
                        <div className="text-center w-full">
                            <p className="font-bold text-sm truncate w-full">{user.displayName}</p>
                            <p className="text-xs text-text-muted truncate w-full">@{user.username}</p>
                        </div>
                        <button
                            onClick={() => onConnect(user.peerId)}
                            className="mt-1 w-full py-1.5 px-3 rounded-lg bg-gold text-black text-xs font-bold hover:bg-gold-light transition-colors"
                        >
                            Connect
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecommendationsView;
