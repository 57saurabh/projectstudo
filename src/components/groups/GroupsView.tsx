'use client';

import { Users, Plus } from 'lucide-react';

export default function GroupsView() {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Communities</h2>
                    <p className="text-text-secondary text-sm">Find your tribe</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-gold text-primary rounded-xl font-bold hover:bg-gold-hover shadow-gold-glow transition-all active:scale-95 text-sm">
                    <Plus size={18} />
                    <span>Create</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pb-4 scrollbar-hide">
                {/* Placeholder Group Cards */}
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-surface border border-border rounded-2xl p-6 hover:border-gold/50 transition-all duration-300 group cursor-pointer hover:shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users size={80} />
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gold to-orange rounded-xl flex items-center justify-center shadow-orange-glow transform group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                                <Users size={24} className="text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1 group-hover:text-gold transition-colors">Community {i}</h3>
                                <p className="text-text-muted text-xs leading-relaxed line-clamp-2">A place to hang out and chat with friends about everything and nothing.</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-medium pt-4 mt-4 border-t border-border">
                            <span className="flex items-center gap-1.5 text-orange">
                                <span className="w-1.5 h-1.5 bg-orange rounded-full animate-pulse" />
                                12 Online
                            </span>
                            <span className="text-text-secondary">45 Members</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
