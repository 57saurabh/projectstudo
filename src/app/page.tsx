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
    Shield, Activity, Search,
    Globe, MessageCircle
} from 'lucide-react';
import Loops from '@/components/dashboard/Loops';
import axios from 'axios';

export default function DashboardPage() {
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch<AppDispatch>();
    const [recommendedUsers, setRecommendedUsers] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);

    useEffect(() => {
        if (user?.id) {
            dispatch(fetchCurrentUser(user.id));
        }
    }, [dispatch, user?.id]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [recRes, actRes] = await Promise.all([
                    axios.get('/api/users/recommended'),
                    axios.get('/api/activity')
                ]);
                setRecommendedUsers(recRes.data);
                setActivities(actRes.data);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            }
        };
        fetchData();
    }, []);

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
        <div className="h-full bg-background text-text-primary p-6 md:p-10 flex flex-col gap-8">
            {/* Top Section: Stories & Go Live */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Stories */}
                <div className="flex-1 w-full overflow-hidden">
                    <h3 className="font-bold text-text-secondary mb-4">Loops</h3>
                    <Loops />
                </div>

                {/* Go Live Card (Moved here) */}
                <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full lg:w-auto min-w-[280px]"
                >
                    <Link href="/live" className="block h-full">
                        <div className="h-full p-6 rounded-[2rem] bg-gradient-to-r from-orange/10 to-surface border border-orange/30 hover:border-orange transition-all duration-300 flex items-center justify-between group shadow-sm hover:shadow-orange-glow">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-orange flex items-center justify-center text-white shadow-lg shadow-orange/30">
                                    <Radio size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-primary">Go Live</h3>
                                    <p className="text-sm text-text-muted">Broadcast now.</p>
                                </div>
                            </div>
                            <div className="px-3 py-1 bg-danger/20 text-danger text-xs font-bold rounded-full animate-pulse">
                                LIVE
                            </div>
                        </div>
                    </Link>
                </motion.div>
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
                                    <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center mb-4 text-primary font-bold">
                                        <Zap size={24} />
                                    </div>
                                    <h2 className="text-4xl font-black italic text-primary mb-2">RANDOM CHAT</h2>
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
                            <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-orange/5 to-surface border border-border hover:border-orange hover:shadow-orange-glow transition-all duration-300 group flex flex-col justify-between relative overflow-hidden">
                                <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-orange">
                                    <Lock size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-primary mb-1">Private Call</h3>
                                    <p className="text-sm text-text-muted">Secure & encrypted.</p>
                                </div>
                                <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity transform translate-x-1/4 translate-y-1/4">
                                    <Lock size={120} />
                                </div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Group Call */}
                    <motion.div variants={itemVariants} className="aspect-square">
                        <Link href="/call/group" className="block h-full">
                            <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-gold/5 to-surface border border-border hover:border-gold hover:shadow-gold-glow transition-all duration-300 group flex flex-col justify-between relative overflow-hidden">
                                <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-gold">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-primary mb-1">Group Call</h3>
                                    <p className="text-sm text-text-muted">The more the merrier.</p>
                                </div>
                                <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity transform translate-x-1/4 translate-y-1/4">
                                    <Users size={120} />
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
                            {recommendedUsers.map((u) => (
                                <div key={u._id} className="flex flex-col items-center gap-2 min-w-[80px]">
                                    <div className="w-14 h-14 rounded-full bg-surface-hover border border-border p-1 relative">
                                        <img
                                            src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u._id}`}
                                            alt={u.displayName}
                                            className="w-full h-full rounded-full bg-background object-cover"
                                        />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-gold rounded-full border-2 border-surface" />
                                    </div>
                                    <span className="text-xs font-medium text-text-primary text-center truncate w-full">{(u.displayName || u.username || 'User').split(' ')[0]}</span>
                                    <button className="p-1 rounded-full bg-surface border border-border hover:bg-gold hover:text-background hover:border-gold transition-colors text-text-muted">
                                        <UserPlus size={12} />
                                    </button>
                                </div>
                            ))}
                            {recommendedUsers.length === 0 && (
                                <p className="text-xs text-text-muted">No recommendations yet.</p>
                            )}
                        </div>
                    </section>

                    {/* Recent Activity */}
                    <section className="bg-surface rounded-3xl p-6 border border-border">
                        <h3 className="font-bold text-text-secondary mb-4 flex items-center gap-2">
                            <Activity size={16} /> Recent Activity
                        </h3>
                        <div className="space-y-4">
                            {activities.map((act) => (
                                <div key={act._id} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-background-secondary flex items-center justify-center text-text-muted text-xs overflow-hidden">
                                        {act.userId.avatarUrl ? (
                                            <img src={act.userId.avatarUrl} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            (act.userId?.displayName || act.userId?.username || 'U')[0]
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-text-primary">
                                            <span className="text-gold font-medium">{act.userId?.displayName || act.userId?.username || 'User'}</span> {act.description}
                                        </p>
                                        <p className="text-xs text-text-muted">
                                            {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {activities.length === 0 && (
                                <p className="text-xs text-text-muted">No recent activity.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
