'use client';

import { Users, Plus } from 'lucide-react';

export default function GroupsPage() {
    return (
        <div className="p-6 lg:p-10 min-h-screen text-white">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Groups</h1>
                    <p className="text-white/50">Connect with communities</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#7f19e6] rounded-xl hover:bg-[#6d14c4] transition-colors">
                    <Plus size={20} />
                    <span>Create Group</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder Group Cards */}
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-[#141118] border border-white/10 rounded-2xl p-6 hover:border-[#7f19e6]/50 transition-colors group cursor-pointer">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mb-4 flex items-center justify-center">
                            <Users size={24} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Community Group {i}</h3>
                        <p className="text-white/40 text-sm mb-4">A place to hang out and chat with friends.</p>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-green-400">12 Online</span>
                            <span className="text-white/30">45 Members</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
