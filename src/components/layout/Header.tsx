'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { Bell, Search, Settings, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '@/lib/store/authSlice';
import Link from 'next/link';

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
        if (path.includes('/dashboard')) return 'Dashboard';
        if (path.includes('/call/pre-check')) return 'Random Chat';
        if (path.includes('/call/private')) return 'Private Call';
        if (path.includes('/call/group')) return 'Group Call';
        if (path.includes('/live')) return 'Live Streaming';
        if (path.includes('/friends')) return 'Friends';
        if (path.includes('/groups')) return 'Groups';
        if (path.includes('/messages')) return 'Messages';
        if (path.includes('/settings')) return 'Settings';
        return 'Zylo';
    };

    const title = getPageTitle(pathname);

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between px-4 py-3 mx-2 mt-2 lg:px-8 lg:py-4 lg:mx-4 lg:mt-4 mb-0 bg-surface/80 backdrop-blur-xl border border-border rounded-3xl shadow-lg z-30 sticky top-2 lg:top-4 transition-colors duration-300"
        >
            {/* Left: Title / Breadcrumbs */}
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-black tracking-tight text-primary">
                    {title}
                </h1>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-6">
                {/* Search Bar (Optional/Visual only for now) */}
                <div className="hidden md:flex items-center px-4 py-2.5 bg-surface-hover rounded-2xl border border-border focus-within:border-gold/50 transition-all w-64 shadow-inner">
                    <Search size={18} className="text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent border-none outline-none ml-2 text-sm text-text-primary w-full placeholder:text-text-muted font-medium"
                    />
                </div>

                {/* Icons */}
                <div className="flex items-center gap-3">
                    <button className="p-2.5 rounded-2xl hover:bg-surface-hover text-text-secondary hover:text-gold transition-colors relative shadow-sm hover:shadow-gold/10">
                        <Bell size={20} />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-danger rounded-full border-2 border-surface shadow-danger-glow" />
                    </button>
                    <Link href="/settings">
                        <button className="p-2.5 rounded-2xl hover:bg-surface-hover text-text-secondary hover:text-gold transition-colors shadow-sm hover:shadow-gold/10">
                            <Settings size={20} />
                        </button>
                    </Link>
                </div>

                {/* Separator */}
                <div className="w-px h-8 bg-border" />

                {/* User Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-3 pl-2 group outline-none"
                    >
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                                {user?.displayName || 'Guest'}
                            </span>
                            <span className="text-xs font-bold text-orange tracking-wider">
                                {user?.reputationScore || 0} XP
                            </span>
                        </div>
                        <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold to-orange p-[2px] shadow-gold-glow group-hover:scale-105 transition-all duration-300">
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
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-surface rounded-full shadow-lg" />
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
                                    <Link href="/settings/profile" onClick={() => setIsDropdownOpen(false)}>
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
