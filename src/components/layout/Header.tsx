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
            className="flex items-center justify-between px-4 py-3 mx-2 mt-2 lg:px-8 lg:py-4 lg:mx-4 lg:mt-4 mb-0 bg-white/80 dark:bg-[#191121]/90 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl shadow-lg z-30 sticky top-2 lg:top-4"
        >
            {/* Left: Title / Breadcrumbs */}
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-white/60">
                    {title}
                </h1>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-6">
                {/* Search Bar (Optional/Visual only for now) */}
                <div className="hidden md:flex items-center px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-xl border border-transparent focus-within:border-purple-500/50 transition-all w-64">
                    <Search size={18} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent border-none outline-none ml-2 text-sm text-gray-700 dark:text-white w-full placeholder:text-gray-400"
                    />
                </div>

                {/* Icons */}
                <div className="flex items-center gap-3">
                    <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-white/60 transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#191121]" />
                    </button>
                    <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-white/60 transition-colors">
                        <Settings size={20} />
                    </button>
                </div>

                {/* Separator */}
                <div className="w-px h-8 bg-gray-200 dark:bg-white/10" />

                {/* User Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-3 pl-2 group outline-none"
                    >
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-purple-500 transition-colors">
                                {user?.displayName || 'Guest'}
                            </span>
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                {user?.reputationScore || 0} XP
                            </span>
                        </div>
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7f19e6] to-[#5b12a5] p-[2px] shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all">
                                <div className="w-full h-full rounded-[10px] bg-white dark:bg-[#191121] flex items-center justify-center overflow-hidden">
                                    {user?.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                                            {user?.displayName?.[0]?.toUpperCase() || 'U'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-[#191121] rounded-full" />
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
                                className="absolute right-0 top-full mt-4 w-64 bg-white dark:bg-[#191121] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden z-50"
                            >
                                <div className="p-4 border-b border-gray-100 dark:border-white/5">
                                    <p className="font-bold text-gray-900 dark:text-white">{user?.displayName || 'Guest'}</p>
                                    <p className="text-xs text-gray-500 dark:text-white/50 truncate">{user?.email || 'No email'}</p>
                                </div>
                                
                                <div className="p-2 space-y-1">
                                    <Link href="/settings/profile" onClick={() => setIsDropdownOpen(false)}>
                                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-white/80 transition-colors cursor-pointer">
                                            <User size={18} />
                                            <span className="font-medium">Profile</span>
                                        </div>
                                    </Link>
                                    <Link href="/settings" onClick={() => setIsDropdownOpen(false)}>
                                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-white/80 transition-colors cursor-pointer">
                                            <Settings size={18} />
                                            <span className="font-medium">Settings</span>
                                        </div>
                                    </Link>
                                </div>

                                <div className="p-2 border-t border-gray-100 dark:border-white/5">
                                    <button 
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                                    >
                                        <LogOut size={18} />
                                        <span className="font-medium">Logout</span>
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
