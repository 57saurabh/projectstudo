

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
    Bell
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
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="fixed top-4 left-4 z-50 p-2 bg-[#191121] text-white rounded-lg border border-white/10 hover:bg-white/10 transition-colors lg:hidden"
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
                    width: isOpen ? 280 : 80,
                }}
                className={`relative h-screen bg-white dark:bg-[#191121] border-r border-gray-200 dark:border-white/10 z-40 hidden lg:flex flex-col transition-all duration-300 ease-in-out flex-shrink-0`}
            >
                {/* Header / Logo */}
                <div className="h-20 flex items-center px-6 border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-3 overflow-hidden w-full">
                        <div className="w-10 h-10 bg-[#7f19e6] rounded-xl flex items-center justify-center font-bold text-xl text-white flex-shrink-0 shadow-lg">
                            Z
                        </div>
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex-1 flex items-center justify-between overflow-hidden"
                                >
                                    <span className="font-bold text-2xl text-gray-900 dark:text-white whitespace-nowrap ml-2">
                                        Zylo
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Toggle Button Row (Matches Image 1 structure) */}
                <div className="flex items-center justify-center py-4 border-b border-gray-200 dark:border-white/10">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-lg text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto flex flex-col">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center rounded-xl transition-all group relative ${isOpen ? 'px-4 py-3 justify-between' : 'justify-center py-3'
                                    } ${isActive
                                        ? 'bg-[#7f19e6]/10 text-[#7f19e6] dark:text-[#7f19e6]'
                                        : 'text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <item.icon size={24} className="flex-shrink-0" />
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

                                {isOpen && (
                                    <ChevronRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}

                                {/* Tooltip for collapsed state */}
                                {!isOpen && (
                                    <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                                        {item.name}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-white/10">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center w-full rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group ${isOpen ? 'px-4 py-3' : 'justify-center py-3'
                            }`}
                    >
                        <LogOut size={24} className="flex-shrink-0" />
                        <AnimatePresence>
                            {isOpen && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="ml-3 font-medium whitespace-nowrap"
                                >
                                    Logout
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>

                    {isOpen && (
                        <div className="mt-4 text-center text-xs text-gray-400 dark:text-white/30">
                            © 2025 Zylo Dashboard
                        </div>
                    )}
                </div>
            </motion.aside>

            {/* Mobile Sidebar (Drawer) */}
            <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: isOpen ? 0 : '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 h-screen w-72 bg-white dark:bg-[#191121] border-r border-gray-200 dark:border-white/10 z-50 lg:hidden flex flex-col"
            >
                <div className="h-20 flex items-center px-6 border-b border-gray-200 dark:border-white/10 justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#7f19e6] rounded-xl flex items-center justify-center font-bold text-xl text-white">
                            Z
                        </div>
                        <span className="font-bold text-xl text-gray-900 dark:text-white">Zylo</span>
                    </div>
                    <button onClick={closeSidebar} className="text-gray-500 dark:text-white/50">
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
                                className={`flex items-center px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-[#7f19e6]/10 text-[#7f19e6]'
                                    : 'text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5'
                                    }`}
                            >
                                <item.icon size={24} />
                                <span className="ml-3 font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </motion.aside>
        </>
    );
}
