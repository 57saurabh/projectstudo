'use client';

import { Settings as SettingsIcon, Bell, Shield, User, ChevronRight, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import Toggle from '@/components/ui/Toggle';
import { useTheme } from '@/lib/context/ThemeContext';

export default function SettingsPage() {
    const [notifications, setNotifications] = useState({
        push: true,
        email: false
    });

    const [privacy, setPrivacy] = useState({
        friendRequests: true,
        onlineStatus: true
    });

    const { theme, toggleTheme } = useTheme();

    return (
        <div className="p-6 lg:p-10 min-h-screen bg-background text-text-primary max-w-4xl mx-auto transition-colors duration-300">
            <div className="mb-10">
                <h1 className="text-4xl font-black tracking-tighter mb-2 text-primary">Settings</h1>
                <p className="text-text-muted font-medium">Manage your preferences and privacy</p>
            </div>

            <div className="space-y-6">
                {/* Account Section Link */}
                <Link href="/settings/profile" className="block group">
                    <section className="bg-surface border border-border rounded-3xl overflow-hidden transition-all duration-300 hover:border-gold/50 hover:shadow-lg hover:shadow-gold/5 group-hover:-translate-y-1">
                        <div className="p-8 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center text-gold shadow-gold-glow group-hover:scale-110 transition-transform duration-300">
                                    <User size={32} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold mb-1 group-hover:text-gold transition-colors text-primary">Account Settings</h2>
                                    <p className="text-text-muted font-medium">Manage your profile details and visibility</p>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center group-hover:bg-gold group-hover:text-white transition-all shadow-sm border border-border group-hover:border-gold">
                                <ChevronRight size={24} />
                            </div>
                        </div>
                    </section>
                </Link>

                {/* Appearance */}
                <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border bg-surface-hover/30">
                        <h2 className="text-xl font-bold flex items-center gap-3 text-primary">
                            {theme === 'dark' ? <Moon size={24} className="text-gold" /> : <Sun size={24} className="text-orange" />}
                            Appearance
                        </h2>
                    </div>
                    <div className="p-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-lg text-text-primary">Dark Mode</p>
                                <p className="text-sm text-text-muted font-medium">Switch between light and dark themes</p>
                            </div>
                            <Toggle
                                checked={theme === 'dark'}
                                onChange={(isChecked) => toggleTheme(isChecked ? 'dark' : 'light')}
                                activeColor="gold"
                            />
                        </div>
                    </div>
                </section>

                {/* Notifications */}
                <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border bg-surface-hover/30">
                        <h2 className="text-xl font-bold flex items-center gap-3 text-primary">
                            <Bell size={24} className="text-gold" />
                            Notifications
                        </h2>
                    </div>
                    <div className="p-8 space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-lg text-text-primary">Push Notifications</p>
                                <p className="text-sm text-text-muted font-medium">Receive alerts for messages and calls</p>
                            </div>
                            <Toggle
                                checked={notifications.push}
                                onChange={(val) => setNotifications(prev => ({ ...prev, push: val }))}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-lg text-text-primary">Email Updates</p>
                                <p className="text-sm text-text-muted font-medium">Get weekly digests and announcements</p>
                            </div>
                            <Toggle
                                checked={notifications.email}
                                onChange={(val) => setNotifications(prev => ({ ...prev, email: val }))}
                            />
                        </div>
                    </div>
                </section>

                {/* Privacy & Safety */}
                <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border bg-surface-hover/30">
                        <h2 className="text-xl font-bold flex items-center gap-3 text-primary">
                            <Shield size={24} className="text-orange" />
                            Privacy & Safety
                        </h2>
                    </div>
                    <div className="p-8 space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-lg text-text-primary">Allow Friend Requests</p>
                                <p className="text-sm text-text-muted font-medium">Let others send you friend requests</p>
                            </div>
                            <Toggle
                                checked={privacy.friendRequests}
                                onChange={(val) => setPrivacy(prev => ({ ...prev, friendRequests: val }))}
                                activeColor="gold"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-lg text-text-primary">Online Status</p>
                                <p className="text-sm text-text-muted font-medium">Show when you are active</p>
                            </div>
                            <Toggle
                                checked={privacy.onlineStatus}
                                onChange={(val) => setPrivacy(prev => ({ ...prev, onlineStatus: val }))}
                                activeColor="green"
                            />
                        </div>
                        <div className="pt-6 border-t border-border">
                            <button className="text-orange font-bold hover:text-orange-hover flex items-center gap-2 transition-colors px-4 py-2 rounded-xl hover:bg-orange/10 -ml-4">
                                Manage Blocked Users <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="bg-danger/5 border border-danger/20 rounded-3xl overflow-hidden mt-8 transition-colors hover:bg-danger/10 hover:border-danger/30">
                    <div className="p-8 flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-danger mb-1">Delete Account</h2>
                            <p className="text-danger/70 text-sm font-medium">Permanently remove your account and data</p>
                        </div>
                        <button className="px-6 py-3 bg-danger text-white rounded-2xl font-bold hover:bg-danger-hover shadow-danger-glow transition-all active:scale-95 border border-danger/20">
                            Delete Account
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
