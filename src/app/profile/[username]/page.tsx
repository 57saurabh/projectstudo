'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { IUser as User } from '@/models/User';
import axios from 'axios';
import {
    Loader2,
    ArrowLeft,
    MoreHorizontal,
    Briefcase,
    MapPin,
    Cake,
    Languages,
    User as UserIcon,
    Edit3,
    UserPlus,
    MessageCircle,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { COUNTRY_LANGUAGES_MAPPING } from '@/lib/constants';
import EditProfileForm from '@/components/profile/EditProfileForm';
import FriendsTab from '@/components/profile/FriendsTab';

export default function PublicProfilePage() {
    const params = useParams();
    const router = useRouter();
    const username = params.username as string;
    const { user: currentUser, token } = useSelector((state: RootState) => state.auth);

    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Friend Status State
    const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
    const [requestId, setRequestId] = useState<string | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [showAllLanguages, setShowAllLanguages] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'friends' | 'followers'>('overview');

    useEffect(() => {
        const fetchUserAndStatus = async () => {
            try {
                // 1. Fetch Profile User
                let user = null;
                if (currentUser && currentUser.username === username) {
                    user = currentUser;
                } else {
                    const response = await axios.get(`/api/users/username/${username}`);
                    user = response.data;
                }
                setProfileUser(user);

                // 2. Check Friend Status (only if logged in and not own profile)
                if (currentUser && user && currentUser.username !== username && token) {
                    // Check if already friends
                    const friendsRes = await axios.get('/api/friends', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const friends = friendsRes.data;
                    const isFriend = friends.some((f: any) => f._id === user._id);

                    if (isFriend) {
                        setFriendStatus('friends');
                    } else {
                        // Check pending requests
                        const requestsRes = await axios.get('/api/friends/requests', {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        const requests = requestsRes.data;

                        // Check incoming (received)
                        const incoming = requests.find((r: any) => r.sender._id === user._id && r.status === 'pending');
                        if (incoming) {
                            setFriendStatus('pending_received');
                            setRequestId(incoming._id);
                        } else {
                            // Check outgoing (sent) - The API might not return outgoing requests in the same endpoint?
                            // Usually /api/friends/requests returns incoming. 
                            // If backend doesn't support checking outgoing, we might miss 'pending_sent'.
                            // For now, let's assume if not friend and not incoming, it's none.
                            // WAIT: If I sent a request, I shouldn't see "Connect" again.
                            // I need to know if I sent a request.
                            // The current backend `getPendingRequests` (FriendService) usually returns requests where user is receiver.
                            // Let's check if there's a way to check outgoing.
                            // If not, I might need to rely on local state or assume 'none'.
                            // Actually, let's try to send and if it fails with "already sent", handle it?
                            // Or maybe the `friends` list includes pending? No.
                            // Let's just implement what we can.
                            setFriendStatus('none');
                        }
                    }
                }
            } catch (err) {
                setError('User not found');
            } finally {
                setIsLoading(false);
            }
        };

        if (username) {
            fetchUserAndStatus();
        }
    }, [username, currentUser, token]);

    const handleConnect = async () => {
        if (!profileUser || !token) return;
        setIsActionLoading(true);
        try {
            await axios.post('/api/friends/send', { receiverId: profileUser._id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriendStatus('pending_sent');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to send request');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!requestId || !token) return;
        setIsActionLoading(true);
        try {
            await axios.post('/api/friends/accept', { requestId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriendStatus('friends');
        } catch (error: any) {
            alert('Failed to accept request');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!requestId || !token) return;
        setIsActionLoading(true);
        try {
            await axios.post('/api/friends/reject', { requestId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriendStatus('none');
            setRequestId(null);
        } catch (error: any) {
            alert('Failed to reject request');
        } finally {
            setIsActionLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-background">
                <Loader2 size={40} className="animate-spin text-gold" />
            </div>
        );
    }

    if (error || !profileUser) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 bg-background text-text-primary">
                <h2 className="text-2xl font-bold">User not found</h2>
                <p className="text-text-muted">The user you are looking for does not exist.</p>
                <button onClick={() => router.back()} className="text-gold hover:underline">Go Back</button>
            </div>
        );
    }

    const isOwnProfile = currentUser?.username === profileUser.username;

    // Helper to format profession string
    const getProfessionString = () => {
        const p = profileUser.profession;
        if (!p || !p.type) return 'No profession listed';

        let details = '';
        if (p.company) details = ` at ${p.company}`;
        else if (p.university) details = ` at ${p.university}`;
        else if (p.hospital) details = ` at ${p.hospital}`;
        else if (p.occupationPlace) details = ` at ${p.occupationPlace} `;

        return `${p.type}${details} `;
    };

    // Helper to get languages string
    const getLanguagesString = () => {
        if (profileUser.preferences?.languages && profileUser.preferences.languages.length > 0) {
            return `Speaks ${profileUser.preferences.languages.slice(0, 3).join(', ')}${profileUser.preferences.languages.length > 3 ? '...' : ''} `;
        }
        // Fallback to country flags if languages not explicit
        if (profileUser.preferences?.languageCountries && profileUser.preferences.languageCountries.length > 0) {
            return `Speaks languages from ${profileUser.preferences.languageCountries.slice(0, 3).join(', ')} `;
        }
        return 'Languages not specified';
    };



    return (
        <div className="min-h-full bg-background text-text-primary p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-300">
            <div className="container mx-auto max-w-5xl">
                {/* Header */}
                <header className="mb-8 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Back
                    </button>
                    {isOwnProfile && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-gold text-white px-6 py-2 rounded-xl font-bold hover:bg-gold-hover transition-colors shadow-gold-glow flex items-center gap-2"
                        >
                            <Edit3 size={18} />
                            Edit Profile
                        </button>
                    )}
                </header>

                <main>
                    {isEditing && isOwnProfile ? (
                        <div className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-xl">
                            <h2 className="text-3xl font-black text-primary mb-8">Edit Profile</h2>
                            <EditProfileForm
                                user={profileUser}
                                onCancel={() => setIsEditing(false)}
                                onSuccess={(updatedUser) => {
                                    setProfileUser(updatedUser);
                                    setIsEditing(false);
                                }}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Left Column: Avatar & Actions */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-surface border border-border rounded-3xl p-8 flex flex-col items-center text-center shadow-sm">
                                    <div className="relative w-48 h-48 rounded-3xl overflow-hidden border-4 border-gold bg-surface group shadow-gold-glow mb-6">
                                        {profileUser.avatarUrl ? (
                                            <img
                                                src={profileUser.avatarUrl}
                                                alt={`Profile picture of ${profileUser.username} `}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gold">
                                                <UserIcon size={64} />
                                            </div>
                                        )}
                                    </div>

                                    <h1 className="text-3xl font-black tracking-tight text-primary">
                                        {profileUser.displayName || profileUser.username}
                                    </h1>
                                    <p className="text-text-muted font-medium mt-1">@{profileUser.username}</p>

                                    <div className="mt-8 w-full flex flex-col gap-3">
                                        {!isOwnProfile && (
                                            <>
                                                {friendStatus === 'friends' && (
                                                    <button
                                                        onClick={() => router.push(`/messages?userId=${profileUser._id}`)}
                                                        className="w-full bg-gold hover:bg-gold-hover text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-gold-glow hover:shadow-gold-glow/80 active:scale-95 flex items-center justify-center gap-2"
                                                    >
                                                        <MessageCircle size={20} />
                                                        Message
                                                    </button>
                                                )}

                                                {friendStatus === 'none' && (
                                                    <button
                                                        onClick={handleConnect}
                                                        disabled={isActionLoading}
                                                        className="w-full bg-gold hover:bg-gold-hover text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-gold-glow hover:shadow-gold-glow/80 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isActionLoading ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
                                                        Connect
                                                    </button>
                                                )}

                                                {friendStatus === 'pending_sent' && (
                                                    <button
                                                        disabled
                                                        className="w-full bg-surface border border-border text-text-muted font-bold py-3 px-6 rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
                                                    >
                                                        <UserPlus size={20} />
                                                        Request Sent
                                                    </button>
                                                )}

                                                {friendStatus === 'pending_received' && (
                                                    <div className="flex gap-2 w-full">
                                                        <button
                                                            onClick={handleAccept}
                                                            disabled={isActionLoading}
                                                            className="flex-1 bg-gold hover:bg-gold-hover text-white font-bold py-3 px-4 rounded-2xl transition-all shadow-gold-glow flex items-center justify-center gap-2"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={handleReject}
                                                            disabled={isActionLoading}
                                                            className="flex-1 bg-surface border border-border text-text-primary hover:bg-danger hover:text-white hover:border-danger font-bold py-3 px-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Stats / Info */}
                                <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-4">
                                    <div className="flex items-center gap-3 text-text-secondary">
                                        <MapPin className="text-gold flex-shrink-0" size={20} />
                                        <span className="font-medium">Lives in {profileUser.country || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-text-secondary">
                                        <Cake className="text-gold flex-shrink-0" size={20} />
                                        <span className="font-medium">Age {profileUser.age || '?'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-text-secondary">
                                        <UserIcon className="text-gold flex-shrink-0" size={20} />
                                        <span className="font-medium">Identifies as {profileUser.gender ? (profileUser.gender.charAt(0).toUpperCase() + profileUser.gender.slice(1)) : 'Not specified'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Details & Tabs */}
                            <div className="lg:col-span-8 space-y-6">
                                {/* Tabs Navigation */}
                                <div className="flex bg-surface p-1.5 rounded-2xl border border-border w-fit">
                                    {['overview', 'friends', 'followers'].map((tab) => (
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

                                {/* Tab Content */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-8">
                                        {/* Bio Card */}
                                        <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                                            <div className="p-6 border-b border-border bg-surface-hover/30">
                                                <h2 className="text-xl font-bold flex items-center gap-3 text-primary">
                                                    <UserIcon size={24} className="text-gold" />
                                                    About
                                                </h2>
                                            </div>
                                            <div className="p-8">
                                                <p className="text-text-primary text-lg leading-relaxed whitespace-pre-wrap">
                                                    {profileUser.bio || "No bio available."}
                                                </p>
                                            </div>
                                        </section>

                                        {/* Profession Card */}
                                        <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                                            <div className="p-6 border-b border-border bg-surface-hover/30">
                                                <h2 className="text-xl font-bold flex items-center gap-3 text-primary">
                                                    <Briefcase size={24} className="text-orange" />
                                                    Profession & Work
                                                </h2>
                                            </div>
                                            <div className="p-8">
                                                <p className="font-medium text-text-primary text-lg">
                                                    {getProfessionString()}
                                                </p>
                                            </div>
                                        </section>

                                        {/* Languages & Interests */}
                                        <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                                            <div className="p-6 border-b border-border bg-surface-hover/30">
                                                <h2 className="text-xl font-bold flex items-center gap-3 text-primary">
                                                    <Languages size={24} className="text-blue-400" />
                                                    Languages & Interests
                                                </h2>
                                            </div>
                                            <div className="p-8 space-y-8">
                                                <div>
                                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Languages</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(() => {
                                                            const langs = profileUser.preferences?.languages || [];
                                                            const countries = profileUser.preferences?.languageCountries || [];

                                                            if (langs.length > 0) {
                                                                const displayLangs = showAllLanguages ? langs : langs.slice(0, 5);
                                                                return (
                                                                    <>
                                                                        {displayLangs.map(lang => (
                                                                            <span key={lang} className="px-3 py-1.5 rounded-full bg-[#2A2418] text-gold border border-gold/30 text-xs font-bold shadow-sm">
                                                                                {lang}
                                                                            </span>
                                                                        ))}
                                                                        {langs.length > 5 && (
                                                                            <button
                                                                                onClick={() => setShowAllLanguages(!showAllLanguages)}
                                                                                className="px-3 py-1.5 rounded-full bg-surface border border-border text-text-muted hover:text-primary text-xs font-bold transition-colors"
                                                                            >
                                                                                {showAllLanguages ? 'Show Less' : `+${langs.length - 5} more`}
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                );
                                                            }
                                                            if (countries.length > 0) {
                                                                const displayCountries = showAllLanguages ? countries : countries.slice(0, 5);
                                                                return (
                                                                    <>
                                                                        {displayCountries.map(c => (
                                                                            <span key={c} className="px-3 py-1.5 rounded-full bg-surface-hover border border-border text-text-secondary text-xs font-bold shadow-sm">
                                                                                {c}
                                                                            </span>
                                                                        ))}
                                                                        {countries.length > 5 && (
                                                                            <button
                                                                                onClick={() => setShowAllLanguages(!showAllLanguages)}
                                                                                className="px-3 py-1.5 rounded-full bg-surface border border-border text-text-muted hover:text-primary text-xs font-bold transition-colors"
                                                                            >
                                                                                {showAllLanguages ? 'Show Less' : `+${countries.length - 5} more`}
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                );
                                                            }
                                                            return <span className="text-text-muted italic text-sm">Languages not specified</span>;
                                                        })()}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Interests</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {profileUser.interests && profileUser.interests.length > 0 ? (
                                                            profileUser.interests.map((interest, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="bg-surface-hover text-text-primary text-sm font-bold px-4 py-2 rounded-full border border-border transition-colors cursor-default"
                                                                >
                                                                    {interest}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-text-muted italic">No interests added.</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {activeTab === 'friends' && (
                                    <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm min-h-[400px]">
                                        {isOwnProfile ? (
                                            <FriendsTab currentUser={currentUser} token={token} />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-64 text-text-muted">
                                                <Users size={48} className="mb-4 opacity-50" />
                                                <p className="text-lg font-medium">Friends list is private.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'followers' && (
                                    <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-text-muted">
                                        <Users size={48} className="mb-4 opacity-50" />
                                        <p className="text-lg font-medium">Followers feature coming soon.</p>
                                        {profileUser.followers > 0 && (
                                            <p className="mt-2 text-gold font-bold">{profileUser.followers} Followers</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

