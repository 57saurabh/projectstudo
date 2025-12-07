'use client';
import { useEffect, useState } from 'react'; import { useSignaling } from '@/lib/webrtc/SignalingContext'; import { Users } from 'lucide-react';

interface OnlineUser {
    id: string;
    displayName: string;
}

export default function OnlineUsersPage() {
    const { socket, getOnlineUsers } = useSignaling();
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

    useEffect(() => {
        // Request initial list
        getOnlineUsers();

        if (socket) {
            socket.on('online-users-list', (users: OnlineUser[]) => {
                setOnlineUsers(users);
            });
        }

        return () => {
            socket?.off('online-users-list');
        };
    }, [socket, getOnlineUsers]);

    return (
        <div className="min-h-screen bg-[#191121] p-6 text-white">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-[#7f19e6]/20 rounded-xl">
                        <Users size={32} className="text-[#7f19e6]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Online Users</h1>
                        <p className="text-white/60">Developers View</p>
                    </div>
                </header>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {onlineUsers.length > 0 ? (
                        onlineUsers.map((user) => (
                            <div key={user.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#7f19e6] to-blue-500 p-[2px]">
                                    <div className="w-full h-full rounded-full bg-[#191121] flex items-center justify-center font-bold text-lg">
                                        {user.displayName?.[0] || 'U'}
                                    </div>
                                </div>
                                <div>
                                    <p className="font-bold">{user.displayName}</p>
                                    <p className="text-xs text-white/40 font-mono">{user.id.slice(0, 8)}...</p>
                                </div>
                                <div className="ml-auto">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 text-white/40">
                            No users online (or server not sending list).
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
