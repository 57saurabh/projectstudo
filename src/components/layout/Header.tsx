'use client';

import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { Bell, Search, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header() {
    const pathname = usePathname();
    const { user } = useSelector((state: RootState) => state.auth);

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
            className="flex items-center justify-between px-8 py-4 mx-4 mt-4 mb-0 bg-white/80 dark:bg-[#191121]/90 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl shadow-lg z-30 sticky top-4"
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

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-2">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {user?.displayName || 'Guest'}
                        </span>
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                            {user?.reputationScore || 0} XP
                        </span>
                    </div>
                    <div className="relative group cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7f19e6] to-[#5b12a5] p-[2px] shadow-lg shadow-purple-500/20">
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
                </div>
            </div>
        </motion.header>
    );
}
