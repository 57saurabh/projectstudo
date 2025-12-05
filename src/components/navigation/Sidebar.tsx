

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
                className="fixed top-4 left-4 z-50 p-3 bg-surface text-text-primary rounded-2xl border border-border hover:bg-surface-hover transition-colors lg:hidden shadow-lg"
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <motion.aside
                initial={false}
                animate={{
                    width: isOpen ? 280 : 100,
                }}
                className={`relative h-[calc(100vh-2rem)] m-4 bg-surface border border-border z-40 hidden lg:flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 rounded-[2.5rem] shadow-2xl`}
            >
                {/* Header / Logo */}
                <div className="h-28 flex items-center px-8">
                    <div className="flex items-center gap-5 overflow-hidden w-full">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-14 h-14 bg-gold rounded-2xl flex items-center justify-center font-black text-2xl text-primary flex-shrink-0 shadow-gold-glow cursor-pointer"
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
                                    <span className="font-black text-3xl tracking-tighter text-text-primary whitespace-nowrap ml-2">
                                        Zylo
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Toggle Button Row */}
                <div className="flex items-center justify-center py-2 mb-4">
                    <button
                        onClick={toggleSidebar}
                        className="p-2.5 rounded-xl text-text-muted hover:bg-surface-hover hover:text-gold transition-all hover:scale-110 active:scale-95"
                    >
                        {isOpen ? <ChevronRight size={22} className="rotate-180" /> : <ChevronRight size={22} />}
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-5 space-y-4 overflow-y-auto flex flex-col scrollbar-hide">
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
                                    className={`flex items-center rounded-2xl transition-all relative z-10 ${isOpen ? 'px-5 py-4' : 'justify-center py-4'
                                        } ${isActive
                                            ? 'text-primary shadow-gold-glow'
                                            : 'text-text-secondary hover:text-text-primary'
                                        }`}
                                >
                                    {/* Active Background */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-gold rounded-2xl"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}

                                    {/* Hover Background for non-active items */}
                                    {!isActive && (
                                        <div className="absolute inset-0 bg-surface-hover rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-border" />
                                    )}

                                    <div className="flex items-center gap-5 relative z-10">
                                        <item.icon
                                            size={26}
                                            className={`flex-shrink-0 transition-colors ${isActive ? 'text-primary' : ''}`}
                                        />
                                        <AnimatePresence>
                                            {isOpen && (
                                                <motion.span
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    className="font-bold text-lg whitespace-nowrap tracking-wide"
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
                                            className="absolute left-full ml-6 px-4 py-2 bg-surface border border-border text-text-primary text-sm font-bold rounded-xl pointer-events-none whitespace-nowrap z-50 shadow-xl"
                                        >
                                            {item.name}
                                            {/* Arrow */}
                                            <div className="absolute top-1/2 -left-1 -mt-1 w-2 h-2 bg-surface border-l border-t border-border transform -rotate-45" />
                                        </motion.div>
                                    )}
                                </motion.div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 mt-auto">
                </div>
            </motion.aside>

            {/* Mobile Sidebar (Drawer) */}
            <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: isOpen ? 0 : '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 h-screen w-80 bg-surface border-r border-border z-50 lg:hidden flex flex-col shadow-2xl"
            >
                <div className="h-28 flex items-center px-8 justify-between bg-surface-hover/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gold rounded-2xl flex items-center justify-center font-black text-xl text-primary shadow-gold-glow">
                            Z
                        </div>
                        <span className="font-black text-2xl text-text-primary tracking-tighter">Zylo</span>
                    </div>
                    <button
                        onClick={closeSidebar}
                        className="p-2 rounded-full hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 py-8 px-5 space-y-3 overflow-y-auto text-text-primary">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={closeSidebar}
                                className={`flex items-center px-5 py-4 rounded-2xl transition-all ${isActive
                                    ? 'bg-gold text-primary shadow-gold-glow'
                                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                                    }`}
                            >
                                <item.icon size={26} />
                                <span className="ml-5 font-bold text-lg">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </motion.aside>
        </>
    );
}
