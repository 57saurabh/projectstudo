'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Video,
    MessageSquare,
    Compass,
    User,
    Ghost
} from 'lucide-react';
import { useSelector } from 'react-redux';

export default function BottomNav() {
    const pathname = usePathname();
    const { user } = useSelector((state: any) => state.auth);

    const navItems = [
        { name: 'Home', href: '/', icon: LayoutDashboard },
        { name: 'Random', href: '/call/pre-check', icon: Ghost },
        { name: 'Discover', href: '/discover', icon: Compass },
        { name: 'Messages', href: '/messages', icon: MessageSquare },
        { name: 'Profile', href: `/profile/${user?.username}`, icon: User },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl border-t border-border lg:hidden pb-safe">
            <nav className="flex items-center justify-around px-2 py-3">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="relative group flex flex-col items-center justify-center w-full"
                        >
                            <div className={`p-2 rounded-xl transition-all duration-300 ${isActive
                                ? 'text-primary'
                                : 'text-text-secondary hover:text-text-primary'
                                }`}>
                                <item.icon
                                    size={24}
                                    className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                {isActive && (
                                    <motion.div
                                        layoutId="bottomNavActive"
                                        className="absolute -bottom-1 w-1 h-1 bg-gold rounded-full shadow-gold-glow"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
