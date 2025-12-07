

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
    Compass,
    User
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/lib/store/authSlice';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/components/layout/SidebarContext';
import { useSignaling } from '@/lib/webrtc/SignalingContext';
export default function Sidebar() {
    const { isOpen, toggleSidebar, closeSidebar } = useSidebar();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const router = useRouter();
    const { unreadCount } = useSignaling();
    const { user } = useSelector((state: any) => state.auth);

    const handleLogout = () => {
        dispatch(logout() as any);
        router.push('/login');
    };

    const navItems = [
        { name: 'Home', href: '/', icon: LayoutDashboard },
        { name: 'Random Chat', href: '/call/pre-check', icon: Ghost },
        { name: 'Discover', href: '/discover', icon: Compass },
        { name: 'Messages', href: '/messages', icon: MessageSquare },
        { name: 'Profile', href: `/profile/${user?.username}`, icon: User },

    ];

    return (
        <motion.aside
            initial={false}
            animate={{
                width: isOpen ? 280 : 100,
            }}
            className={`relative h-[calc(100vh-2rem)] m-4 bg-surface border border-border z-40 hidden lg:flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 rounded-[2.5rem] shadow-2xl`}
        >
            {/* Header / Logo */}
            <div className="h-28 flex items-center relative">
                <div className="flex items-center gap-5 w-full">
                    {!isOpen && (
                        <span className='w-16 h-16 flex items-center justify-center ml-4'>
                            <img src="/logomain.png" alt="Socialin" className="w-full h-full object-contain" />
                        </span>)}
                    <AnimatePresence>
                        {isOpen && (
                            <span className=" h-24 flex-1 flex items-center justify-between overflow-hidden"
                            >
                                <img src="/logo.png" alt="Socialin" className="w-full h-full object-contain" />

                            </span>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Absolute Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-11 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center shadow-md z-50 cursor-pointer hover:scale-110 transition-transform text-text-muted hover:text-gold"
            >
                <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>



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
    );
}
