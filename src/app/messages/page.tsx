'use client';

import { MessageSquare, Search } from 'lucide-react';

export default function MessagesPage() {
    return (
        <div className="p-6 lg:p-10 min-h-screen text-white flex flex-col h-screen">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Messages</h1>
                <p className="text-white/50">Your conversations</p>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Chat List */}
                <div className="w-full md:w-80 lg:w-96 bg-[#141118] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                            <input
                                type="text"
                                placeholder="Search chats..."
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#7f19e6]/50"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                                <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-medium truncate">User {i}</h4>
                                        <span className="text-xs text-white/30">12:30 PM</span>
                                    </div>
                                    <p className="text-sm text-white/40 truncate">Hey, how are you doing?</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area (Empty State) */}
                <div className="hidden md:flex flex-1 bg-[#141118] border border-white/10 rounded-2xl items-center justify-center flex-col text-white/30">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare size={40} />
                    </div>
                    <p className="text-lg font-medium">Select a chat to start messaging</p>
                </div>
            </div>
        </div>
    );
}
