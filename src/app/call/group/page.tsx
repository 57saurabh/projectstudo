'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowRight, Hash } from 'lucide-react';

export default function GroupCallPage() {
    const router = useRouter();
    const [roomId, setRoomId] = useState('');

    const createGroup = () => {
        const newRoomId = Math.random().toString(36).substring(7);
        router.push(`/call/room/${newRoomId}?type=group`);
    };

    const joinGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomId.trim()) {
            router.push(`/call/room/${roomId}?type=group`);
        }
    };

    return (
        <div className="min-h-screen bg-background text-text-primary p-10 flex items-center justify-center transition-colors duration-300">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Group Calls</h1>
                    <p className="text-text-secondary text-lg">Hang out with up to 10 friends at once.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Create Group */}
                    <div className="bg-surface border border-glass-border rounded-3xl p-8 hover:border-pink-500/50 transition-all group cursor-pointer" onClick={createGroup}>
                        <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center mb-6 text-pink-500 group-hover:scale-110 transition-transform">
                            <Users size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Start a Group Call</h2>
                        <p className="text-text-secondary mb-6">Create a new room and invite your friends.</p>
                        <div className="flex items-center text-pink-500 font-medium">
                            Create Now <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* Join Group */}
                    <div className="bg-surface border border-glass-border rounded-3xl p-8 hover:border-pink-500/50 transition-all">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 text-purple-500">
                            <Hash size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-4">Join via Code</h2>
                        <form onSubmit={joinGroup} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Enter Group Code"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="w-full bg-glass-bg border border-glass-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-pink-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!roomId.trim()}
                                className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
                            >
                                Join Group
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
