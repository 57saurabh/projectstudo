'use client';

import { MessageSquare, Search } from 'lucide-react';

export default function MessagesPage() {
    return (
        <div className="p-6 lg:p-10 min-h-screen text-text-primary flex flex-col h-screen transition-colors duration-300">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Messages</h1>
                <p className="text-text-secondary">Your conversations</p>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Chat List */}
                <div className="w-full md:w-80 lg:w-96 bg-surface border border-glass-border rounded-2xl flex flex-col overflow-hidden transition-colors duration-300">
                    <div className="p-4 border-b border-glass-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type="text"
                                placeholder="Search chats..."
                                className="w-full bg-glass-bg border border-glass-border rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary focus:outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-glass-bg cursor-pointer transition-colors">
                                <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-medium truncate">User {i}</h4>
                                        <span className="text-xs text-text-secondary">12:30 PM</span>
                                    </div>
                                    <p className="text-sm text-text-secondary truncate">Hey, how are you doing?</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area (Empty State) */}
                <div className="hidden md:flex flex-1 bg-surface border border-glass-border rounded-2xl items-center justify-center flex-col text-text-secondary transition-colors duration-300">
                    <div className="w-20 h-20 bg-glass-bg rounded-full flex items-center justify-center mb-4">
                        <MessageSquare size={40} />
                    </div>
                    <p className="text-lg font-medium">Select a chat to start messaging</p>
                </div>
            </div>
        </div>
    );
}
