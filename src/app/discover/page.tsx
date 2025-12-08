'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, UserPlus, UserCheck, UserX, Loader2 } from 'lucide-react';
import { debounce } from 'lodash';
import { toast } from 'react-hot-toast';

interface SearchResult {
    _id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
    isFollowing: boolean;
    friendStatus: 'none' | 'friend' | 'requested' | 'pending_approval';
}

export default function DiscoverPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [recommendations, setRecommendations] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const fetchRecommendations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users/recommended', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Map recommendations to match SearchResult interface if needed
                // Assuming recommendations endpoint returns similar structure or we adapt it
                // We might need to fetch status for these too, or endpoint should return it.
                // For now assuming endpoint returns basic user data, we'll map status as 'none' initially
                // Ideally recommended endpoint should return this status.
                const mapped = data.map((u: any) => ({
                    ...u,
                    friendStatus: 'none', // Default, logic should be improved ideally
                    isFollowing: false     // Default
                }));
                setRecommendations(mapped);
            }
        } catch (error) {
            console.error('Failed to fetch recommendations', error);
        }
    };

    const searchUsers = async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setSearching(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setResults(data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to search users');
        } finally {
            setSearching(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(debounce(searchUsers, 500), []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        debouncedSearch(e.target.value);
    };

    const handleFriendRequest = async (userId: string, action: 'send' | 'cancel') => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users/friend-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId: userId, action })
            });

            if (res.ok) {
                const data = await res.json();
                const updateList = (list: SearchResult[]) => list.map(user => {
                    if (user._id === userId) {
                        return { ...user, friendStatus: data.status };
                    }
                    return user;
                });

                setResults(prev => updateList(prev));
                setRecommendations(prev => updateList(prev));

                toast.success(data.message);
            } else {
                const error = await res.json();
                toast.error(error.message);
            }
        } catch (error) {
            console.error(error);
            toast.error('Action failed');
        }
    };

    const handleFollow = async (userId: string, action: 'follow' | 'unfollow') => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users/follow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId: userId, action })
            });

            if (res.ok) {
                const data = await res.json();
                const updateList = (list: SearchResult[]) => list.map(user => {
                    if (user._id === userId) {
                        return { ...user, isFollowing: data.isFollowing };
                    }
                    return user;
                });

                setResults(prev => updateList(prev));
                setRecommendations(prev => updateList(prev));

                toast.success(data.message);
            } else {
                const error = await res.json();
                toast.error(error.message);
            }
        } catch (error) {
            console.error(error);
            toast.error('Action failed');
        }
    };

    const displayList = query ? results : recommendations;
    const isRecommendations = !query && recommendations.length > 0;

    return (
        <div className="h-full bg-background text-text-primary p-6 md:p-10 flex flex-col gap-6 overflow-hidden">
            <h1 className="text-3xl font-bold">Discover People</h1>

            <div className="relative max-w-xl w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                <input
                    type="text"
                    placeholder="Search by name, username or email..."
                    className="w-full pl-10 pr-4 py-3 bg-surface rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-text-secondary"
                    value={query}
                    onChange={handleSearch}
                />
                {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-primary" size={20} />
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
                {isRecommendations && (
                    <h2 className="text-xl font-semibold mb-4 text-text-secondary">You may know</h2>
                )}

                {query && results.length === 0 && !searching ? (
                    <div className="text-center text-text-secondary py-10">
                        No users found matching "{query}"
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayList.map(user => (
                            <div key={user._id} className="bg-surface p-4 rounded-xl border border-border hover:border-primary/50 transition-colors flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-surface-hover overflow-hidden shrink-0">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-text-secondary">
                                                {user.displayName.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold truncate">{user.displayName}</h3>
                                        <p className="text-sm text-text-secondary truncate">@{user.username}</p>
                                    </div>
                                </div>

                                {user.bio && (
                                    <p className="text-sm text-text-secondary line-clamp-2 min-h-10">
                                        {user.bio}
                                    </p>
                                )}

                                <div className="flex gap-2 mt-auto pt-2">
                                    {/* Friend Request Button */}
                                    {user.friendStatus === 'friend' ? (
                                        <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-hover text-green-500 text-sm font-medium cursor-default">
                                            <UserCheck size={16} />
                                            Friends
                                        </button>
                                    ) : user.friendStatus === 'requested' ? (
                                        <button
                                            onClick={() => handleFriendRequest(user._id, 'cancel')}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-hover text-text-secondary hover:bg-red-500/10 hover:text-red-500 text-sm font-medium transition-colors"
                                        >
                                            <UserX size={16} />
                                            Requested
                                        </button>
                                    ) : user.friendStatus === 'pending_approval' ? (
                                        <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10 text-primary text-sm font-medium cursor-default">
                                            Pending
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleFriendRequest(user._id, 'send')}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary text-black hover:bg-gold-light text-sm font-medium transition-colors"
                                        >
                                            <UserPlus size={16} />
                                            Add Friend
                                        </button>
                                    )}

                                    {/* Follow Button */}
                                    <button
                                        onClick={() => handleFollow(user._id, user.isFollowing ? 'unfollow' : 'follow')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${user.isFollowing
                                            ? 'border-border text-text-secondary hover:border-red-500/50 hover:text-red-500'
                                            : 'border-primary text-primary hover:bg-primary/10'
                                            }`}
                                    >
                                        {user.isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!query && recommendations.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p>Search for people to add or follow</p>
                    </div>
                )}
            </div>
        </div>
    );
}
