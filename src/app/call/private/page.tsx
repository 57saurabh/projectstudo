'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Phone, ArrowRight } from 'lucide-react';

export default function PrivateCallPage() {
    const router = useRouter();
    const [roomId, setRoomId] = useState('');

    const createRoom = () => {
        const newRoomId = Math.random().toString(36).substring(7);
        router.push(`/call/room/${newRoomId}`);
    };

    const joinRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomId.trim()) {
            router.push(`/call/room/${roomId}`);
        }
    };

    return (
        <div className="min-h-screen bg-[#f7f6f8] dark:bg-[#191121] text-white p-10 flex items-center justify-center">
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-10">

                {/* Create Room Section */}
                <div className="bg-[#141118] border border-white/10 rounded-3xl p-8 flex flex-col justify-between hover:border-[#7f19e6]/50 transition-colors group">
                    <div>
                        <div className="w-16 h-16 bg-[#7f19e6]/20 rounded-2xl flex items-center justify-center mb-6 text-[#7f19e6]">
                            <Phone size={32} />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Create Private Room</h2>
                        <p className="text-white/50 mb-8">
                            Start a secure, encrypted video call. Share the link with a friend to invite them.
                        </p>
                    </div>
                    <button
                        onClick={createRoom}
                        className="w-full py-4 bg-[#7f19e6] hover:bg-[#6d14c4] rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                    >
                        <span>Create New Room</span>
                        <ArrowRight size={20} />
                    </button>
                </div>

                {/* Join Room Section */}
                <div className="bg-[#141118] border border-white/10 rounded-3xl p-8 flex flex-col justify-between hover:border-blue-500/50 transition-colors">
                    <div>
                        <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 text-blue-500">
                            <Copy size={32} />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Join Existing Room</h2>
                        <p className="text-white/50 mb-8">
                            Enter a room code to join an existing call.
                        </p>
                    </div>
                    <form onSubmit={joinRoom} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Enter Room Code"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!roomId.trim()}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-all"
                        >
                            Join Room
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
