

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Video,
    Users,
    MessageSquare,
    Settings,
    LogOut,
    Menu,
    X,
    Ghost,
    ChevronRight,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '@/lib/store/authSlice';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/components/layout/SidebarContext';
import { useSignaling } from '@/lib/webrtc/useSignaling';

export default function Sidebar() {
    const { isOpen, toggleSidebar, closeSidebar } = useSidebar();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const router = useRouter();
    const { unreadCount } = useSignaling();

    const handleLogout = () => {
        dispatch(logout() as any);
        router.push('/login');
    };

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Random Chat', href: '/call/pre-check', icon: Ghost },
        { name: 'Friends', href: '/friends', icon: Users },
        { name: 'Groups', href: '/groups', icon: Video },
        { name: 'Messages', href: '/messages', icon: MessageSquare },

    ];

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="fixed top-4 left-4 z-50 p-2 bg-[#191121] text-white rounded-xl border border-white/10 hover:bg-white/10 transition-colors lg:hidden shadow-lg"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeSidebar}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <motion.aside
                initial={false}
                animate={{
                    width: isOpen ? 280 : 90,
                }}
                className={`relative h-[calc(100vh-2rem)] m-4 bg-white/80 dark:bg-[#191121]/90 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 z-40 hidden lg:flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 rounded-3xl shadow-2xl`}
            >
                {/* Header / Logo */}
                <div className="h-24 flex items-center px-6">
                    <div className="flex items-center gap-4 overflow-hidden w-full">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-12 h-12 bg-gradient-to-br from-[#7f19e6] to-[#5b12a5] rounded-2xl flex items-center justify-center font-bold text-xl text-white flex-shrink-0 shadow-lg shadow-purple-500/30"
                        >
                            Z
                        </motion.div>
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex-1 flex items-center justify-between overflow-hidden"
                                >
                                    <span className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-white/60 whitespace-nowrap ml-2">
                                        Zylo
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Toggle Button Row */}
                <div className="flex items-center justify-center py-2 mb-2">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-xl text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5 transition-all hover:scale-110 active:scale-95"
                    >
                        {isOpen ? <ChevronRight size={20} className="rotate-180" /> : <ChevronRight size={20} />}
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 space-y-3 overflow-y-auto flex flex-col custom-scrollbar">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="relative group"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex items-center rounded-2xl transition-all relative z-10 ${isOpen ? 'px-4 py-3.5' : 'justify-center py-3.5'
                                        } ${isActive
                                            ? 'text-white shadow-lg shadow-purple-500/25'
                                            : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    {/* Active Background */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-gradient-to-r from-[#7f19e6] to-[#6314b3] rounded-2xl"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}

                                    {/* Hover Background for non-active items */}
                                    {!isActive && (
                                        <div className="absolute inset-0 bg-gray-100 dark:bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                    )}

                                    <div className="flex items-center gap-4 relative z-10">
                                        <item.icon
                                            size={24}
                                            className={`flex-shrink-0 transition-colors ${isActive ? 'text-white' : ''}`}
                                        />
                                        <AnimatePresence>
                                            {isOpen && (
                                                <motion.span
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    className="font-medium whitespace-nowrap"
                                                >
                                                    {item.name}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Tooltip for collapsed state */}
                                    {!isOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                            whileInView={{ opacity: 0, x: 20, scale: 0.95 }}
                                            whileHover={{ opacity: 1, x: 0, scale: 1 }}
                                            className="absolute left-full ml-6 px-4 py-2 bg-gray-900/90 dark:bg-white/10 backdrop-blur-md text-white text-sm font-medium rounded-xl pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10"
                                        >
                                            {item.name}
                                            {/* Arrow */}
                                            <div className="absolute top-1/2 -left-1 -mt-1 border-4 border-transparent border-r-gray-900/90 dark:border-r-white/10" />
                                        </motion.div>
                                    )}
                                </motion.div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer - Removed Logout (Moved to Header) */}
                <div className="p-4 mt-auto">
                    {/* Placeholder or empty if needed, or just remove the div entirely. 
                        Keeping the div with mt-auto ensures the nav stays at top. 
                        Actually, nav has flex-1, so it pushes footer down. 
                        If I remove footer content, I can remove the div.
                    */}
                </div>
            </motion.aside>

            {/* Mobile Sidebar (Drawer) */}
            <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: isOpen ? 0 : '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 h-screen w-80 bg-white dark:bg-[#191121] z-50 lg:hidden flex flex-col shadow-2xl"
            >
                <div className="h-24 flex items-center px-8 justify-between bg-gradient-to-r from-gray-50 to-white dark:from-[#1f1629] dark:to-[#191121]">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#7f19e6] to-[#5b12a5] rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-purple-500/20">
                            Z
                        </div>
                        <span className="font-bold text-xl text-gray-900 dark:text-white">Zylo</span>
                    </div>
                    <button
                        onClick={closeSidebar}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-white/50"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={closeSidebar}
                                className={`flex items-center px-4 py-4 rounded-xl transition-all ${isActive
                                        ? 'bg-gradient-to-r from-[#7f19e6] to-[#6314b3] text-white shadow-lg shadow-purple-500/25'
                                        : 'text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5'
                                    }`}
                            >
                                <item.icon size={24} />
                                <span className="ml-4 font-medium text-lg">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </motion.aside>
        </>
    );
}
