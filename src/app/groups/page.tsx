'use client';

import { Users, Plus } from 'lucide-react';

export default function GroupsPage() {
    return (
        <div className="p-6 lg:p-10 min-h-screen text-text-primary transition-colors duration-300">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Groups</h1>
                    <p className="text-text-secondary">Connect with communities</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl hover:opacity-90 transition-colors text-white">
                    <Plus size={20} />
                    <span>Create Group</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder Group Cards */}
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-surface border border-glass-border rounded-2xl p-6 hover:border-primary/50 transition-colors group cursor-pointer">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mb-4 flex items-center justify-center">
                            <Users size={24} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Community Group {i}</h3>
                        <p className="text-text-secondary text-sm mb-4">A place to hang out and chat with friends.</p>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-green-400">12 Online</span>
                            <span className="text-text-secondary">45 Members</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
