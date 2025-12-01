'use client';

import { Settings as SettingsIcon, Bell, Shield, User, Volume2, Moon, Sun, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/lib/context/ThemeContext';

export default function SettingsPage() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="p-6 lg:p-10 min-h-screen text-text-primary max-w-4xl mx-auto transition-colors duration-300">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-text-secondary">Manage your preferences</p>
            </div>

            <div className="space-y-6">
                {/* Account Section */}
                {/* Account Section */}
                <Link href="/settings/profile" className="block group">
                    <section className="bg-surface border border-glass-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/50">
                        <div className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Account Settings</h2>
                                    <p className="text-text-secondary">Manage your profile details and visibility</p>
                                </div>
                            </div>
                            <ChevronRight className="text-text-secondary group-hover:text-primary transition-colors" size={24} />
                        </div>
                    </section>
                </Link>

                {/* Notifications */}
                <section className="bg-surface border border-glass-border rounded-2xl overflow-hidden transition-colors duration-300">
                    <div className="p-6 border-b border-glass-border">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Bell size={20} className="text-primary" />
                            Notifications
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="font-medium">Push Notifications</p>
                            <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Appearance */}
                <section className="bg-surface border border-glass-border rounded-2xl overflow-hidden transition-colors duration-300">
                    <div className="p-6 border-b border-glass-border">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {theme === 'dark' ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-primary" />}
                            Appearance
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="font-medium">Dark Mode</p>
                            <div 
                                onClick={toggleTheme}
                                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${theme === 'dark' ? 'bg-primary' : 'bg-gray-400'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${theme === 'dark' ? 'right-1' : 'left-1'}`} />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
