'use client';

import { Users, Plus } from 'lucide-react';

export default function GroupsPage() {
    return (
        <div className="p-6 lg:p-10 min-h-screen bg-background text-text-primary transition-colors duration-300">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
                    <p className="text-text-secondary">Connect with communities</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-gold text-primary rounded-2xl font-bold hover:bg-gold-hover shadow-gold-glow transition-all active:scale-95">
                    <Plus size={20} />
                    <span>Create Group</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder Group Cards */}
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-surface border border-border rounded-3xl p-8 hover:border-gold/50 transition-all duration-300 group cursor-pointer hover:shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users size={120} />
                        </div>

                        <div className="w-14 h-14 bg-gradient-to-br from-gold to-orange rounded-2xl mb-6 flex items-center justify-center shadow-orange-glow transform group-hover:scale-110 transition-transform duration-300">
                            <Users size={28} className="text-primary" />
                        </div>

                        <h3 className="text-2xl font-bold mb-2 group-hover:text-gold transition-colors">Community Group {i}</h3>
                        <p className="text-text-muted text-sm mb-6 leading-relaxed">A place to hang out and chat with friends.</p>

                        <div className="flex items-center justify-between text-sm font-medium pt-4 border-t border-border">
                            <span className="flex items-center gap-2 text-orange">
                                <span className="w-2 h-2 bg-orange rounded-full animate-pulse" />
                                12 Online
                            </span>
                            <span className="text-text-secondary">45 Members</span>
                        </div>

                        {/* Video Grid Hint */}
                        <div className="mt-4 flex -space-x-2">
                            {[1, 2, 3, 4].map(u => (
                                <div key={u} className="w-8 h-8 rounded-full border-2 border-surface bg-surface-hover" />
                            ))}
                            <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-hover flex items-center justify-center text-xs font-bold text-text-secondary">+8</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
