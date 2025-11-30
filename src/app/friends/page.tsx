'use client';
import { useState } from 'react';
import { Search, UserPlus, Phone, MessageSquare, MoreVertical, Circle } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock Data
const MOCK_FRIENDS = [
    { id: '1', name: 'Sarah Connor', status: 'online', avatar: 'S' },
    { id: '2', name: 'John Wick', status: 'offline', avatar: 'J' },
    { id: '3', name: 'Tony Stark', status: 'busy', avatar: 'T' },
    { id: '4', name: 'Bruce Wayne', status: 'online', avatar: 'B' },
];

export default function FriendsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'online' | 'pending'>('all');

    const filteredFriends = MOCK_FRIENDS.filter(friend => {
        if (activeTab === 'online' && friend.status !== 'online') return false;
        return friend.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="flex-1 flex flex-col h-screen bg-[#f7f6f8] dark:bg-[#191121] overflow-hidden p-6 lg:p-10">
            <div className="max-w-5xl w-full mx-auto flex flex-col h-full gap-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Friends</h1>
                        <p className="text-white/50">Manage your connections</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#7f19e6] text-white rounded-xl font-medium hover:bg-[#6d14c4] transition-colors">
                        <UserPlus size={20} />
                        Add Friend
                    </button>
                </div>

                {/* Search & Tabs */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                        <input
                            type="text"
                            placeholder="Search friends..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#141118] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-[#7f19e6]/50 transition-colors"
                        />
                    </div>
                    <div className="flex bg-[#141118] p-1 rounded-xl border border-white/10">
                        {['all', 'online', 'pending'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-6 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab
                                        ? 'bg-[#7f19e6] text-white shadow-lg'
                                        : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Friends List */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {filteredFriends.map((friend, idx) => (
                        <motion.div
                            key={friend.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center justify-between p-4 bg-[#141118] border border-white/5 rounded-2xl hover:border-white/10 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gray-700 to-gray-800 flex items-center justify-center font-bold text-lg text-white">
                                        {friend.avatar}
                                    </div>
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#141118] ${friend.status === 'online' ? 'bg-green-500' :
                                            friend.status === 'busy' ? 'bg-red-500' : 'bg-gray-500'
                                        }`} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{friend.name}</h3>
                                    <p className="text-white/40 text-sm capitalize">{friend.status}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                    <MessageSquare size={20} />
                                </button>
                                <button className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors">
                                    <Phone size={20} />
                                </button>
                                <button className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                        </motion.div>
                    ))}

                    {filteredFriends.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-white/40">
                            <Search size={48} className="mb-4 opacity-50" />
                            <p>No friends found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
