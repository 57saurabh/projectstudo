'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Lock, Users, Shuffle, Twitter, Instagram, MessageCircle } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden font-sans selection:bg-secondary selection:text-white">

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                            <span className="font-bold text-lg">Z</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">Zylo</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                        <Link href="#" className="hover:text-white transition-colors">Features</Link>
                        <Link href="#" className="hover:text-white transition-colors">Friends</Link>
                        <Link href="#" className="hover:text-white transition-colors">Support</Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/signup">
                            <Button className="bg-secondary hover:bg-secondary/90 text-white px-6 rounded-full font-semibold text-sm h-10">
                                Signup
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button variant="ghost" className="bg-white/5 hover:bg-white/10 text-white px-6 rounded-full font-semibold text-sm h-10 border-none">
                                Login
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-32 flex flex-col items-center justify-center text-center px-6">
                {/* Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />

                <div className="z-10 space-y-8 max-w-4xl mx-auto">
                    <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white mb-4">
                        Zylo
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-400 font-medium max-w-2xl mx-auto">
                        Instant Video. Private. Smart. Gen-Z Approved.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                        <Link href="/dashboard">
                            <Button className="bg-secondary hover:bg-secondary/90 text-white px-8 py-6 rounded-xl font-bold text-lg shadow-[0_0_30px_rgba(138,43,226,0.3)] transition-transform hover:scale-105">
                                Start Random Chat
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button variant="ghost" className="bg-white/5 hover:bg-white/10 text-white px-8 py-6 rounded-xl font-bold text-lg border border-white/10">
                                Login
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Zylo is Purrfect</h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Connect instantly with friends or meet new people. High-quality, private video chat designed for how you actually talk.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Feature 1 */}
                    <div className="bg-[#121217] p-8 rounded-3xl border border-white/5 hover:border-secondary/30 transition-colors group">
                        <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6 group-hover:scale-110 transition-transform">
                            <Shuffle size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Random Chat</h3>
                        <p className="text-gray-400 leading-relaxed">
                            Jump into a random, one-on-one video chat. You never know who you'll meet.
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-[#121217] p-8 rounded-3xl border border-white/5 hover:border-secondary/30 transition-colors group">
                        <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6 group-hover:scale-110 transition-transform">
                            <Lock size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Private Calls</h3>
                        <p className="text-gray-400 leading-relaxed">
                            Call your friends directly for a secure, end-to-end encrypted conversation.
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-[#121217] p-8 rounded-3xl border border-white/5 hover:border-secondary/30 transition-colors group">
                        <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6 group-hover:scale-110 transition-transform">
                            <Users size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Group Hangouts</h3>
                        <p className="text-gray-400 leading-relaxed">
                            Get the whole squad together. Group calls for up to 10 users, no hassle.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 text-center px-6">
                <h2 className="text-4xl md:text-6xl font-black mb-6">Ready to Dive In?</h2>
                <p className="text-xl text-gray-400 mb-10">Sign up now. It's free and takes less than a minute.</p>
                <Link href="/signup">
                    <Button className="bg-secondary hover:bg-secondary/90 text-white px-10 py-6 rounded-full font-bold text-xl shadow-[0_0_40px_rgba(138,43,226,0.4)] hover:shadow-[0_0_60px_rgba(138,43,226,0.6)] transition-all">
                        Signup Now
                    </Button>
                </Link>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 bg-[#050508]">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-8 text-sm text-gray-500">
                        <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                        <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-white transition-colors">Contact Us</Link>
                    </div>

                    <div className="flex items-center gap-6">
                        <a href="#" className="text-gray-500 hover:text-white transition-colors"><Twitter size={20} /></a>
                        <a href="#" className="text-gray-500 hover:text-white transition-colors"><Instagram size={20} /></a>
                        <a href="#" className="text-gray-500 hover:text-white transition-colors"><MessageCircle size={20} /></a>
                    </div>

                    <p className="text-sm text-gray-600">
                        © 2024 Zylo. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
