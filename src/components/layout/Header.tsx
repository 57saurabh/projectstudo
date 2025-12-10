'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { Bell, Search, Settings, LogOut, User, MessageCircle, UserPlus, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '@/lib/store/authSlice';
import { useSignaling } from '@/lib/webrtc/SignalingContext';
import { useCallStore } from '@/lib/store/useCallStore'; // Import Store
import Link from 'next/link';

const NotificationBell = () => {
    const { unreadCount } = useSignaling();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Get notifications from store
    const notifications = useCallStore((s) => s.notifications);
    const markAsRead = useCallStore((s) => s.markNotificationAsRead);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClick = (n: any) => {
        markAsRead(n.id);
        setIsOpen(false);
        if (n.link) router.push(n.link);
    };

    const hasUnread = unreadCount > 0 || notifications.some(n => !n.isRead);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 lg:p-2.5 rounded-2xl hover:bg-surface-hover text-text-secondary hover:text-gold transition-colors relative shadow-sm hover:shadow-gold/10"
            >
                <Bell size={20} />
                {hasUnread && (
                    <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white shadow-danger-glow">
                        {(unreadCount + notifications.filter(n => !n.isRead).length) > 9 ? '9+' : (unreadCount + notifications.filter(n => !n.isRead).length)}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-4 w-80 bg-surface/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-border overflow-hidden z-50 ring-1 ring-gold/10"
                    >
                        <div className="p-4 border-b border-border bg-surface-hover/30 flex justify-between items-center">
                            <h3 className="font-bold text-text-primary">Notifications</h3>
                            <span className="text-xs text-gold font-medium">{notifications.length} New</span>
                        </div>

                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 && unreadCount === 0 ? (
                                <div className="p-8 text-center text-text-muted text-sm">
                                    No new notifications
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {/* Show Unread Messages Header if any */}
                                    {unreadCount > 0 && (
                                        <div
                                            onClick={() => { setIsOpen(false); router.push('/messages'); }}
                                            className="p-4 hover:bg-surface-hover cursor-pointer transition-colors flex items-start gap-3 bg-gold/5"
                                        >
                                            <div className="p-2 rounded-full bg-gold/20 text-gold mt-1"><MessageCircle size={16} /></div>
                                            <div>
                                                <p className="font-bold text-sm text-text-primary">Unread Messages</p>
                                                <p className="text-xs text-text-muted">You have {unreadCount} unread chats.</p>
                                            </div>
                                        </div>
                                    )}

                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => handleClick(n)}
                                            className={`p-4 hover:bg-surface-hover cursor-pointer transition-colors flex items-start gap-3 ${!n.isRead ? 'bg-surface-hover/50' : ''}`}
                                        >
                                            <div className="p-2 rounded-full bg-surface border border-border mt-1">
                                                {n.type === 'message' ? <MessageCircle size={16} className="text-blue-400" /> :
                                                    n.type === 'friend' ? <UserPlus size={16} className="text-green-400" /> :
                                                        <Zap size={16} className="text-gold" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-text-primary">{n.title}</p>
                                                <p className="text-xs text-text-muted line-clamp-2">{n.description}</p>
                                                <p className="text-[10px] text-text-muted/60 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                            {!n.isRead && (
                                                <div className="w-2 h-2 rounded-full bg-gold mt-2 ml-auto shrink-0" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        dispatch(logout() as any);
        router.push('/login');
    };

    const getPageTitle = (path: string) => {
        if (path === '/') return 'Home';
        if (path.includes('/call/pre-check')) return 'Random Chat';
        if (path.includes('/call/private')) return 'Private Call';
        if (path.includes('/call/group')) return 'Group Call';
        if (path.includes('/live')) return 'Live Streaming';
        if (path.includes('/friends')) return 'Friends';
        if (path.includes('/groups')) return 'Groups';
        if (path.includes('/messages')) return 'Messages';
        if (path.includes('/settings')) return 'Settings';
        return 'Socialin';
    };

    const title = getPageTitle(pathname);

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between px-4 py-3 mx-2 mt-2 lg:px-8 lg:py-4 lg:mx-4 lg:mt-4 mb-0 bg-surface/80 backdrop-blur-xl border border-border rounded-3xl shadow-lg z-30 sticky top-2 lg:top-4 transition-colors duration-300 relative"
        >
            {/* Left: Logo (Mobile) / Title (Desktop) */}
            <div className="flex items-center gap-4 z-20">
                <div className="lg:hidden">
                    <img src="/logomain.png" alt="Socialin" className="h-8 w-auto object-contain" />
                </div>

                <div className="hidden lg:flex items-center gap-4">
                    <h1 className="text-2xl font-black tracking-tight text-primary">
                        {title}
                    </h1>
                </div>
            </div>

            {/* Center: Title (Mobile Only) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:hidden">
                <h1 className="text-xl font-black tracking-tight text-primary">
                    {title}
                </h1>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-3 lg:gap-6 z-20">
                {/* Icons */}
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    {/* Settings Icon Removed */}
                </div>

                {/* Separator */}
                <div className="w-px h-6 lg:h-8 bg-border" />

                {/* User Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-3 pl-1 lg:pl-2 group outline-none"
                    >
                        <div className="relative">
                            <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-br from-gold to-orange p-[2px] shadow-gold-glow group-hover:scale-105 transition-all duration-300">
                                <div className="w-full h-full rounded-[14px] bg-surface flex items-center justify-center overflow-hidden">
                                    {user?.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-black text-lg text-gold">
                                            {user?.displayName?.[0]?.toUpperCase() || 'U'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 lg:w-4 lg:h-4 bg-green-500 border-2 border-surface rounded-full shadow-lg" />
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                        {isDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute right-0 top-full mt-4 w-72 bg-surface/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-border overflow-hidden z-50 ring-1 ring-gold/10"
                            >
                                <div className="p-6 border-b border-border bg-surface-hover/30">
                                    <p className="font-bold text-lg text-text-primary">{user?.displayName || 'Guest'}</p>
                                    <p className="text-xs text-text-muted font-medium truncate">{user?.email || 'No email'}</p>
                                </div>

                                <div className="p-3 space-y-1">
                                    <Link href={`/profile/${user?.username}`} onClick={() => setIsDropdownOpen(false)}>
                                        <div className="flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-surface-hover text-text-primary transition-colors cursor-pointer group">
                                            <div className="p-2 rounded-xl bg-surface border border-border group-hover:border-gold/50 group-hover:text-gold transition-colors">
                                                <User size={18} />
                                            </div>
                                            <span className="font-bold text-sm">Profile</span>
                                        </div>
                                    </Link>
                                    <Link href="/settings" onClick={() => setIsDropdownOpen(false)}>
                                        <div className="flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-surface-hover text-text-primary transition-colors cursor-pointer group">
                                            <div className="p-2 rounded-xl bg-surface border border-border group-hover:border-gold/50 group-hover:text-gold transition-colors">
                                                <Settings size={18} />
                                            </div>
                                            <span className="font-bold text-sm">Settings</span>
                                        </div>
                                    </Link>
                                </div>

                                <div className="p-3 border-t border-border mt-1">
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-4 px-4 py-3 w-full rounded-2xl hover:bg-danger/10 text-danger transition-colors group"
                                    >
                                        <div className="p-2 rounded-xl bg-surface border border-border group-hover:border-danger/30 transition-colors">
                                            <LogOut size={18} />
                                        </div>
                                        <span className="font-bold text-sm">Logout</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.header>
    );
}
