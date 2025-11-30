'use client';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store/store';
import { fetchCurrentUser } from '@/lib/store/authSlice';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Home, Users, History, Settings, ArrowRight, Phone, Radio, Users as UsersIcon } from 'lucide-react';

export default function DashboardPage() {
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        if (user?.id) {
            dispatch(fetchCurrentUser(user.id));
        }
    }, [dispatch, user?.id]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring" as const,
                stiffness: 100
            }
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-[#f7f6f8] dark:bg-[#191121] font-sans text-white overflow-hidden">



            <main className="flex-1 flex flex-col relative">
                {/* Top Navbar */}
                <header className="flex items-center justify-between px-10 py-6 border-b border-white/10 bg-[#191121]/80 backdrop-blur-md z-20">
                    <h1 className="text-2xl font-bold">Welcome back, {user?.displayName || 'Viber'}</h1>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-xs text-white/50 font-medium">Reputation</span>
                            <span className="text-sm font-bold text-[#7f19e6]">{user?.reputationScore || 100} XP</span>
                        </div>
                        <div className="relative group cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7f19e6] to-blue-500 p-[2px]">
                                <div className="w-full h-full rounded-full bg-[#191121] flex items-center justify-center overflow-hidden">
                                    <span className="font-bold text-sm">{user?.displayName?.[0] || 'U'}</span>
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#191121] rounded-full"></div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 flex items-center justify-center p-10 relative">
                    {/* Background Blobs */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-[#7f19e6]/10 rounded-full blur-[120px]" />
                        <div className="absolute -bottom-[20%] -right-[10%] w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[120px]" />
                    </div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-6 w-full max-w-5xl h-[600px] z-10"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Random Chat */}
                        <motion.div variants={itemVariants} className="col-span-1 row-span-1 group">
                            <Link href="/call/pre-check" className="block h-full">
                                <div className="h-full p-8 rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-white/10 hover:border-[#7f19e6]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(127,25,230,0.2)] flex flex-col justify-between group-hover:-translate-y-1">
                                    <div>
                                        <h2 className="text-3xl font-bold mb-2">Start Random Chat</h2>
                                        <p className="text-gray-400">Meet someone new. Or don't.</p>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="w-12 h-12 rounded-full bg-[#7f19e6]/20 flex items-center justify-center text-[#7f19e6] group-hover:bg-[#7f19e6] group-hover:text-white transition-colors">
                                            <ArrowRight size={24} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>

                        {/* Private Call */}
                        <motion.div variants={itemVariants} className="col-span-1 row-span-2 group">
                            <Link href="/call/private" className="block h-full">
                                <div className="h-full p-8 rounded-3xl bg-gradient-to-br from-[#7f19e6] to-[#6d14c4] backdrop-blur-xl border border-white/10 hover:shadow-[0_0_40px_rgba(127,25,230,0.4)] transition-all duration-300 flex flex-col justify-between group-hover:-translate-y-1">
                                    <div>
                                        <h2 className="text-3xl font-bold mb-2">Start Private Call</h2>
                                        <p className="text-white/80">Connect with a friend securely.</p>
                                    </div>
                                    <div className="flex justify-end">
                                        <Phone size={64} className="text-white/20 group-hover:text-white/40 transition-colors rotate-12" />
                                    </div>
                                </div>
                            </Link>
                        </motion.div>

                        {/* Go Live */}
                        <motion.div variants={itemVariants} className="col-span-1 row-span-2 group">
                            <Link href="/live" className="block h-full">
                                <div className="h-full p-8 rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-white/10 hover:border-teal-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(20,184,166,0.2)] flex flex-col justify-between group-hover:-translate-y-1">
                                    <div>
                                        <h2 className="text-3xl font-bold mb-2">Go Live</h2>
                                        <p className="text-gray-400">Broadcast to your crew.</p>
                                    </div>
                                    <div className="flex justify-end">
                                        <Radio size={64} className="text-teal-500/20 group-hover:text-teal-500 transition-colors" />
                                    </div>
                                </div>
                            </Link>
                        </motion.div>

                        {/* Group Call */}
                        <motion.div variants={itemVariants} className="col-span-1 row-span-1 group">
                            <Link href="/call/group" className="block h-full">
                                <div className="h-full p-8 rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-white/10 hover:border-pink-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] flex flex-col justify-between group-hover:-translate-y-1">
                                    <div>
                                        <h2 className="text-3xl font-bold mb-2">Group Call</h2>
                                        <p className="text-gray-400">Up to 10 people.</p>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                                            <UsersIcon size={24} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
