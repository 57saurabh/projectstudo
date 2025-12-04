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
        <div className="flex-1 flex items-center justify-center relative min-h-full">
            {/* Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-[#7f19e6]/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-4 md:gap-6 w-full max-w-5xl h-auto md:h-[600px] z-10 p-4 md:p-0"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Random Chat */}
                <motion.div variants={itemVariants} className="col-span-1 row-span-1 group min-h-[200px]">
                    <Link href="/call/pre-check" className="block h-full">
                        <div className="h-full p-6 md:p-8 rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-white/10 hover:border-[#7f19e6]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(127,25,230,0.2)] flex flex-col justify-between group-hover:-translate-y-1">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold mb-2">Start Random Chat</h2>
                                <p className="text-gray-400 text-sm md:text-base">Meet someone new. Or don't.</p>
                            </div>
                            <div className="flex justify-end">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#7f19e6]/20 flex items-center justify-center text-[#7f19e6] group-hover:bg-[#7f19e6] group-hover:text-white transition-colors">
                                    <ArrowRight size={20} className="md:w-6 md:h-6" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </motion.div>

                {/* Private Call */}
                <motion.div variants={itemVariants} className="col-span-1 md:row-span-2 group min-h-[240px]">
                    <Link href="/call/private" className="block h-full">
                        <div className="h-full p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[#7f19e6] to-[#6d14c4] backdrop-blur-xl border border-white/10 hover:shadow-[0_0_40px_rgba(127,25,230,0.4)] transition-all duration-300 flex flex-col justify-between group-hover:-translate-y-1">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold mb-2">Start Private Call</h2>
                                <p className="text-white/80 text-sm md:text-base">Connect with a friend securely.</p>
                            </div>
                            <div className="flex justify-end">
                                <Phone size={48} className="text-white/20 group-hover:text-white/40 transition-colors rotate-12 md:w-16 md:h-16" />
                            </div>
                        </div>
                    </Link>
                </motion.div>

                {/* Go Live */}
                <motion.div variants={itemVariants} className="col-span-1 md:row-span-2 group min-h-[240px]">
                    <Link href="/live" className="block h-full">
                        <div className="h-full p-6 md:p-8 rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-white/10 hover:border-teal-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(20,184,166,0.2)] flex flex-col justify-between group-hover:-translate-y-1">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold mb-2">Go Live</h2>
                                <p className="text-gray-400 text-sm md:text-base">Broadcast to your crew.</p>
                            </div>
                            <div className="flex justify-end">
                                <Radio size={48} className="text-teal-500/20 group-hover:text-teal-500 transition-colors md:w-16 md:h-16" />
                            </div>
                        </div>
                    </Link>
                </motion.div>

                {/* Group Call */}
                <motion.div variants={itemVariants} className="col-span-1 row-span-1 group min-h-[200px]">
                    <Link href="/call/group" className="block h-full">
                        <div className="h-full p-6 md:p-8 rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-white/10 hover:border-pink-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] flex flex-col justify-between group-hover:-translate-y-1">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold mb-2">Group Call</h2>
                                <p className="text-gray-400 text-sm md:text-base">Up to 10 people.</p>
                            </div>
                            <div className="flex justify-end">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                                    <UsersIcon size={20} className="md:w-6 md:h-6" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}
