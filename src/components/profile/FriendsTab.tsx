'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus, MoreVertical, MessageSquare, Phone, Video, Users, Clock, Shield, Filter, Loader2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { IUser } from '@/models/User';

interface FriendRequest {
    _id: string;
    sender: IUser;
    receiver: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
}

interface FriendsTabProps {
    currentUser: IUser | null;
    token: string | null;
}

export default function FriendsTab({ currentUser, token }: FriendsTabProps) {
    const [activeTab, setActiveTab] = useState<'all' | 'online' | 'pending' | 'blocked'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [friends, setFriends] = useState<IUser[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [searchResults, setSearchResults] = useState<IUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (token) {
            fetchFriends();
            fetchPendingRequests();
        }
    }, [token]);

    const fetchFriends = async () => {
        try {
            const res = await axios.get('/api/friends', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriends(res.data);
        } catch (error) {
            console.error('Failed to fetch friends', error);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const res = await axios.get('/api/friends/requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingRequests(res.data);
        } catch (error) {
            console.error('Failed to fetch requests', error);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await axios.get(`/api/users/search?q=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearchResults(res.data);
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setIsSearching(false);
        }
    };

    const sendFriendRequest = async (receiverId: string) => {
        try {
            await axios.post('/api/friends', { receiverId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Friend request sent!');
            setSearchResults(prev => prev.filter(u => u._id !== receiverId));
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to send request');
        }
    };

    const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
        try {
            await axios.put(`/api/friends/requests/${requestId}`, { action }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchPendingRequests();
            if (action === 'accept') fetchFriends();
        } catch (error) {
            console.error('Action failed', error);
        }
    };

    // Filter friends based on active tab
    const filteredFriends = friends.filter(friend => {
        if (activeTab === 'online') return friend.status === 'online';
        return true;
    });

    return (
        <div className="flex flex-col gap-6">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Add Friend Search */}
                <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-gold transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Find friends by Private ID..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full bg-surface border border-border rounded-2xl pl-12 pr-4 py-4 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all placeholder:text-text-muted"
                    />

                    {/* Search Results Dropdown */}
                    {searchQuery.length >= 3 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
                            {isSearching ? (
                                <div className="p-4 text-center text-text-secondary">Searching...</div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(user => (
                                    <div key={user._id} className="flex items-center justify-between p-4 hover:bg-surface-hover transition-colors border-b border-border last:border-0">
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.displayName}`} alt={user.displayName} className="w-10 h-10 rounded-full bg-background" />
                                            <div>
                                                <p className="font-bold text-text-primary">{user.displayName}</p>
                                                <p className="text-xs text-text-muted">@{user.username}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => sendFriendRequest(user._id)}
                                            className="p-2 bg-surface border border-border text-gold rounded-xl hover:bg-gold hover:text-white transition-all shadow-sm"
                                        >
                                            <UserPlus size={18} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-text-secondary">No users found</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex bg-surface p-1.5 rounded-2xl border border-border">
                    {['all', 'online', 'pending'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === tab
                                ? 'bg-gold text-primary shadow-gold-glow'
                                : 'text-text-secondary hover:text-text-primary hover:bg-background'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Friends List */}
            <div className="space-y-3 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activeTab === 'pending' ? (
                        pendingRequests.length > 0 ? (
                            pendingRequests.map((req) => (
                                <motion.div
                                    key={req._id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-surface border border-border rounded-3xl p-6 hover:border-gold/50 transition-all duration-300 group hover:shadow-lg"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <img
                                                    src={req.sender.avatarUrl || `https://ui-avatars.com/api/?name=${req.sender.displayName}`}
                                                    alt={req.sender.displayName}
                                                    className="w-14 h-14 rounded-full object-cover border-2 border-surface group-hover:border-gold transition-colors block bg-background"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-text-primary">{req.sender.displayName}</h3>
                                                <p className="text-gold text-sm font-medium">@{req.sender.username}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => handleRequestAction(req._id, 'accept')}
                                            className="flex-1 bg-gold text-primary py-2.5 rounded-xl font-bold hover:bg-gold-hover hover:shadow-gold-glow transition-all flex items-center justify-center gap-2"
                                        >
                                            <Check size={18} /> Accept
                                        </button>
                                        <button
                                            onClick={() => handleRequestAction(req._id, 'reject')}
                                            className="flex-1 bg-surface border border-border text-text-secondary py-2.5 rounded-xl font-medium hover:bg-danger hover:text-white hover:border-danger hover:shadow-danger-glow transition-all flex items-center justify-center gap-2"
                                        >
                                            <X size={18} /> Reject
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 text-text-muted">
                                No pending requests
                            </div>
                        )
                    ) : (
                        filteredFriends.map((friend) => (
                            <motion.div
                                key={friend._id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-surface border border-border rounded-3xl p-6 hover:border-orange/50 transition-all duration-300 group hover:shadow-lg"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <img
                                                src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${friend.displayName}`}
                                                alt={friend.displayName}
                                                className="w-14 h-14 rounded-full object-cover border-2 border-surface group-hover:border-orange transition-colors bg-background"
                                            />
                                            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-surface ${friend.status === 'online' ? 'bg-orange shadow-orange-glow' :
                                                friend.status === 'in-call' ? 'bg-danger' :
                                                    'bg-text-muted'
                                                }`} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-text-primary">{friend.displayName}</h3>
                                            <p className="text-text-muted text-sm">@{friend.username}</p>
                                        </div>
                                    </div>
                                    <button className="p-2 hover:bg-surface-hover rounded-full text-text-secondary hover:text-text-primary transition-colors">
                                        <MoreVertical size={20} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-text-muted mb-6">
                                    <div className="flex items-center gap-1">
                                        <Users size={14} />
                                        <span>0 Mutual</span>
                                    </div>
                                    {friend.status === 'online' && (
                                        <div className="flex items-center gap-1 text-orange font-medium">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
                                            <span>Online</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => router.push(`/messages?userId=${friend._id}`)}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-surface border border-border text-text-primary font-bold hover:border-gold hover:text-gold transition-all duration-300"
                                    >
                                        <MessageSquare size={18} />
                                        <span>Message</span>
                                    </button>
                                    <button
                                        onClick={() => router.push(`/call/private?userId=${friend._id}`)}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-orange text-primary font-bold hover:bg-orange-hover hover:shadow-orange-glow transition-all duration-300"
                                    >
                                        <Video size={18} />
                                        <span>Call</span>
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
