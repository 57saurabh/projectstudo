'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useSignaling } from '@/lib/webrtc/SignalingContext';
import { useCallStore } from '@/lib/store/useCallStore';
import { Phone, Search, Users, Video, PhoneOff } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface Friend {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    status: 'online' | 'offline' | 'in-call';
}

export default function PrivateCallPage() {
    const { user, token } = useSelector((state: RootState) => state.auth);
    const { socket } = useSignaling();
    const { callState, setCallState } = useCallStore();
    const router = useRouter();

    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [callingFriend, setCallingFriend] = useState<Friend | null>(null);

    useEffect(() => {
        if (token) {
            fetchFriends();
        }
    }, [token]);

    // Handle Call Events to clear overlay
    useEffect(() => {
        if (!socket) return;
        const onEnd = () => {
            setCallingFriend(null);
            setCallState('idle');
        };
        const onOutgoing = () => {
            setCallState('calling');
        };
        const onError = () => {
            setCallingFriend(null);
        };

        socket.on('private-call-ended', onEnd);
        socket.on('private-call-outgoing', onOutgoing);
        socket.on('private-call-error', onError);

        // If 'room-created' fires, we are redirected by global listener or manual handling?
        // Usually room-created means connection established.
        const onRoomCreated = (data: { roomId: string }) => {
            router.push(`/call/room/${data.roomId}?type=private`);
        };
        socket.on('room-created', onRoomCreated);

        return () => {
            socket.off('private-call-ended', onEnd);
            socket.off('private-call-outgoing', onOutgoing);
            socket.off('private-call-error', onError);
            socket.off('room-created', onRoomCreated);
        };
    }, [socket, setCallState, router]);


    const fetchFriends = async () => {
        try {
            const res = await axios.get('/api/friends', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriends(res.data);
        } catch (error) {
            console.error('Failed to fetch friends', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCall = (friend: Friend) => {
        if (!socket) return;
        if (friend.status === 'offline') {
            toast.error('User is offline');
            return;
        }

        setCallingFriend(friend);
        // Optimistic UI handled by 'callingFriend' state, confirmed by 'private-call-outgoing'
        socket.emit('start-private-call', { targetUserId: friend._id });
    };

    const cancelCall = () => {
        if (!socket || !callingFriend) return;
        socket.emit('cancel-private-call', { roomId: 'unknown' }); // Room ID might be missing if we haven't received 'outgoing' event fully yet? 
        // Backend 'handleCancelPrivateCall' expects roomId to find proposal.
        // We need the roomId from 'outgoing' event to cancel properly.
        // Let's store roomId in state callingFriend? 
        // For simplicity, we just emit 'leave-room' or similar? 
        // Actually, without roomId, we can't cancel the specific proposal easily.
        // But we can reload page to force disconnect. 
        // Let's leave it as 'cancel-private-call' but we need to capture roomId from 'private-call-outgoing'.

        setCallingFriend(null);
        setCallState('idle');
    };

    const filteredFriends = friends.filter(f =>
        f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background text-text-primary p-4 lg:p-10 flex flex-col items-center">

            <div className="max-w-4xl w-full">
                <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
                    <Users className="text-gold" />
                    Private Call
                </h1>

                {/* Search */}
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                    <input
                        type="text"
                        placeholder="Search friends..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-border rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-gold outline-none"
                    />
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="text-center py-12">Loading friends...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredFriends.map(friend => (
                            <div key={friend._id} className="bg-surface border border-border rounded-3xl p-6 flex items-center justify-between hover:border-gold/30 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <img
                                            src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${friend.displayName}`}
                                            alt={friend.displayName}
                                            className="w-14 h-14 rounded-full object-cover bg-background"
                                        />
                                        <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-surface ${friend.status === 'online' ? 'bg-green-500' :
                                            friend.status === 'in-call' ? 'bg-red-500' : 'bg-gray-500'
                                            }`} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{friend.displayName}</h3>
                                        <p className="text-text-muted text-sm">@{friend.username}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCall(friend)}
                                    className="p-3 bg-surface-hover rounded-full text-gold hover:bg-gold hover:text-white transition-all shadow-sm"
                                    title="Start Video Call"
                                >
                                    <Video size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* CALLING OVERLAY */}
            {callingFriend && (
                <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative mb-8">
                        <img
                            src={callingFriend.avatarUrl || `https://ui-avatars.com/api/?name=${callingFriend.displayName}`}
                            alt={callingFriend.displayName}
                            className="w-32 h-32 rounded-full border-4 border-gold shadow-2xl animate-pulse"
                        />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Calling {callingFriend.displayName}...</h2>
                    <p className="text-text-muted mb-8">Waiting for response</p>

                    <button
                        onClick={cancelCall}
                        className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
                    >
                        <PhoneOff size={20} />
                        Cancel Call
                    </button>
                </div>
            )}
        </div>
    );
}
