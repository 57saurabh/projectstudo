'use client';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store/store';
import { fetchCurrentUser } from '@/lib/store/authSlice';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
    Zap, Lock, Users, Radio, 
    Settings, UserPlus, Heart, 
    Shield, Activity, Search
} from 'lucide-react';

export default function DashboardPage() {
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch<AppDispatch>();
    const [privateMode, setPrivateMode] = useState(false);

    useEffect(() => {
        if (user?.id) {
            dispatch(fetchCurrentUser(user.id));
        }
    }, [dispatch, user?.id]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring" as const, stiffness: 100 }
        }
    };

    return (
        <div className="min-h-full bg-background text-text-primary p-6 md:p-10 flex flex-col gap-8">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-surface border-2 border-gold p-1">
                        <img 
                            src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'User'}`} 
                            alt="Profile" 
                            className="w-full h-full rounded-full bg-background-secondary"
                        />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
                            Hey, <span className="text-gold">{user?.username || 'Stranger'}</span>
                        </h1>
                        <p className="text-text-secondary text-sm">Ready to cause some chaos?</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Private Mode Toggle */}
                    <button 
                        onClick={() => setPrivateMode(!privateMode)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${
                            privateMode 
                            ? 'bg-gold/10 border-gold text-gold shadow-gold-glow' 
                            : 'bg-surface border-border text-text-muted hover:border-gold/50'
                        }`}
                    >
                        <Shield size={18} />
                        <span className="font-semibold">{privateMode ? 'Private Mode ON' : 'Go Private'}</span>
                    </button>
                    
                    {/* Quick Settings */}
                    <Link href="/settings">
                        <button className="p-3 rounded-full bg-surface border border-border text-text-secondary hover:text-gold hover:border-gold transition-colors">
                            <Settings size={20} />
                        </button>
                    </Link>
                </div>
            </header>

            {/* Quick Actions Bar */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { icon: Users, label: 'Friends', href: '/friends' },
                    { icon: Users, label: 'Groups', href: '/groups' },
                    { icon: Search, label: 'Find', href: '/search' },
                ].map((action, i) => (
                    <Link key={i} href={action.href}>
                        <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-surface border border-border hover:border-orange hover:bg-surface-hover transition-all cursor-pointer group">
                            <action.icon size={18} className="text-text-muted group-hover:text-orange transition-colors" />
                            <span className="font-medium text-text-secondary group-hover:text-text-primary">{action.label}</span>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Grid - CTA Tiles */}
                <motion.div 
                    className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Random Chat */}
                    <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 aspect-[2/1] md:aspect-[3/1]">
                        <Link href="/call/pre-check" className="block h-full">
                            <div className="h-full p-8 rounded-[2rem] bg-gradient-to-r from-gold/20 via-surface to-surface border border-gold/30 hover:border-gold hover:shadow-gold-glow transition-all duration-300 group relative overflow-hidden">
                                <div className="relative z-10 flex flex-col justify-center h-full">
                                    <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center mb-4 text-background font-bold">
                                        <Zap size={24} />
                                    </div>
                                    <h2 className="text-4xl font-black italic text-white mb-2">RANDOM CHAT</h2>
                                    <p className="text-accent-cream opacity-80 max-w-sm">
                                        Throw caution to the wind. Meet the unexpected.
                                    </p>
                                </div>
                                <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity transform translate-x-1/4 translate-y-1/4">
                                    <Zap size={300} />
                                </div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Private Call */}
                    <motion.div variants={itemVariants} className="aspect-square">
                        <Link href="/call/private" className="block h-full">
                            <div className="h-full p-6 rounded-[2rem] bg-surface border border-border hover:border-orange hover:shadow-orange-glow transition-all duration-300 group flex flex-col justify-between">
                                <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-orange">
                                    <Lock size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Private Call</h3>
                                    <p className="text-sm text-text-muted">Secure & encrypted.</p>
                                </div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Group Call */}
                    <motion.div variants={itemVariants} className="aspect-square">
                        <Link href="/call/group" className="block h-full">
                            <div className="h-full p-6 rounded-[2rem] bg-surface border border-border hover:border-gold hover:shadow-gold-glow transition-all duration-300 group flex flex-col justify-between">
                                <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-gold">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Group Call</h3>
                                    <p className="text-sm text-text-muted">The more the merrier.</p>
                                </div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Go Live */}
                    <motion.div variants={itemVariants} className="col-span-1 md:col-span-2">
                        <Link href="/live" className="block h-full">
                            <div className="h-full p-6 rounded-[2rem] bg-gradient-to-r from-orange/10 to-surface border border-orange/30 hover:border-orange transition-all duration-300 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-orange flex items-center justify-center text-white">
                                        <Radio size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Go Live</h3>
                                        <p className="text-sm text-text-muted">Broadcast yourself now.</p>
                                    </div>
                                </div>
                                <div className="px-3 py-1 bg-danger/20 text-danger text-xs font-bold rounded-full animate-pulse">
                                    LIVE
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Right Sidebar */}
                <div className="space-y-8">
                    {/* People You May Like */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-text-secondary">People You May Like</h3>
                            <button className="text-xs text-gold hover:underline">View All</button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex flex-col items-center gap-2 min-w-[80px]">
                                    <div className="w-14 h-14 rounded-full bg-surface-hover border border-border p-1 relative">
                                        <img 
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} 
                                            alt="User" 
                                            className="w-full h-full rounded-full bg-background"
                                        />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-gold rounded-full border-2 border-surface" />
                                    </div>
                                    <span className="text-xs font-medium text-text-primary text-center truncate w-full">User {i}</span>
                                    <button className="p-1 rounded-full bg-surface border border-border hover:bg-gold hover:text-background hover:border-gold transition-colors text-text-muted">
                                        <UserPlus size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                    
                    {/* Recent Activity */}
                    <section className="bg-surface rounded-3xl p-6 border border-border">
                        <h3 className="font-bold text-text-secondary mb-4 flex items-center gap-2">
                            <Activity size={16} /> Recent Activity
                        </h3>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-background-secondary flex items-center justify-center text-text-muted text-xs">U{i}</div>
                                    <div className="flex-1">
                                        <p className="text-sm text-text-primary">
                                            <span className="text-gold font-medium">User {i}</span> just went live!
                                        </p>
                                        <p className="text-xs text-text-muted">2 mins ago</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
