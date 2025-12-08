import React from 'react';
import { UserPlus, X } from 'lucide-react';
import { useState } from 'react';

interface RecommendationsViewProps {
    recommendations: any[]; // User objects
    onConnect: (peerId: string) => void;
    onClose: () => void;
    title?: string;
}

export default function RecommendationsView({ recommendations, onConnect, onClose, title = "Match Found" }: RecommendationsViewProps) {
    const [hasAccepted, setHasAccepted] = useState(false);

    if (recommendations.length === 0) return null;

    console.log('RecommendationsView rendering:', recommendations);

    // Helper to safely render text
    const safeText = (val: any) => (typeof val === 'string' || typeof val === 'number') ? val : '';

    return (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-surface/95 backdrop-blur-md border border-gold/30 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 flex flex-col items-center gap-4 w-[90%] max-w-md">
            <div className="flex justify-between items-center w-full">
                <h3 className="text-gold font-bold text-xl flex items-center gap-2">
                    <UserPlus size={24} />
                    {title}
                </h3>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content: Single User or Multiple */}
            {recommendations.length === 1 ? (
                // Single User Display
                <div className="flex flex-col items-center gap-3 w-full">
                    <div className="w-24 h-24 rounded-full bg-surface-hover border-2 border-gold/20 p-1">
                        <img
                            src={recommendations[0].avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${recommendations[0].peerId}`}
                            alt={safeText(recommendations[0].displayName) as string}
                            className="w-full h-full rounded-full object-cover bg-background"
                        />
                    </div>
                    <div className="text-center w-full">
                        <p className="font-bold text-lg">{safeText(recommendations[0].displayName)}</p>
                        <p className="text-sm text-text-muted">@{safeText(recommendations[0].username)}</p>

                        {/* Profession & Reputation */}
                        <div className="flex items-center justify-center gap-2 mt-1">
                            {typeof recommendations[0].profession === 'string' && recommendations[0].profession && (
                                <span className="text-xs bg-surface-hover px-2 py-0.5 rounded-full text-text-secondary">
                                    {recommendations[0].profession}
                                </span>
                            )}
                            <span className="text-xs text-gold flex items-center gap-1">
                                ★ {typeof recommendations[0].reputation === 'number' ? recommendations[0].reputation : 0}
                            </span>
                        </div>

                        {/* Country & Language */}
                        <div className="flex items-center justify-center gap-2 mt-1 text-xs text-text-secondary">
                            {typeof recommendations[0].country === 'string' && recommendations[0].country && <span>📍 {recommendations[0].country}</span>}
                            {typeof recommendations[0].language === 'string' && recommendations[0].language && <span>🗣️ {recommendations[0].language}</span>}
                        </div>

                        {/* Interests */}
                        {Array.isArray(recommendations[0].interests) && recommendations[0].interests.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1 mt-2">
                                {recommendations[0].interests.slice(0, 3).map((tag: any, i: number) => (
                                    typeof tag === 'string' ? (
                                        <span key={i} className="text-[10px] border border-white/10 px-1.5 py-0.5 rounded text-text-muted">
                                            {tag}
                                        </span>
                                    ) : null
                                ))}
                            </div>
                        )}

                        {typeof recommendations[0].bio === 'string' && recommendations[0].bio && <p className="text-xs text-text-secondary mt-2 max-w-[200px] truncate mx-auto italic">"{recommendations[0].bio}"</p>}
                    </div>
                </div>
            ) : (
                // Multiple Users (Group Invite)
                <div className="flex flex-col items-center w-full">
                    <div className="flex justify-center -space-x-4 py-2">
                        {recommendations.slice(0, 4).map((user, i) => (
                            <div key={user.peerId} className="relative w-16 h-16 rounded-full border-2 border-surface bg-surface-hover z-[${10 - i}]" title={user.displayName}>
                                <img
                                    src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.peerId}`}
                                    alt={user.displayName}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>
                        ))}
                        {recommendations.length > 4 && (
                            <div className="w-16 h-16 rounded-full border-2 border-surface bg-neutral-800 flex items-center justify-center text-xs font-bold text-white z-0">
                                +{recommendations.length - 4}
                            </div>
                        )}
                    </div>
                    <div className="pt-4 pb-2 text-center w-full">
                        <p className="text-sm font-medium">{recommendations.length} people want to traverse with you.</p>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 w-full mt-2">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-colors border border-red-500/20"
                >
                    Decline
                </button>
                <button
                    onClick={() => {
                        setHasAccepted(true);
                        onConnect(recommendations[0]?.peerId);
                    }}
                    disabled={hasAccepted}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${hasAccepted
                        ? 'bg-gold/20 text-gold border border-gold/50 cursor-wait'
                        : 'bg-gold text-black hover:bg-gold-light shadow-gold/20'
                        }`}
                >
                    {hasAccepted ? (
                        <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Waiting...
                        </>
                    ) : (
                        'Accept'
                    )}
                </button>
            </div>
        </div>
    );
};


