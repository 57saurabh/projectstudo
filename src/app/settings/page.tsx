'use client';

import { Settings as SettingsIcon, Bell, Shield, User, Volume2, Moon } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="p-6 lg:p-10 min-h-screen text-white max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-white/50">Manage your preferences</p>
            </div>

            <div className="space-y-6">
                {/* Account Section */}
                <section className="bg-[#141118] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <User size={20} className="text-[#7f19e6]" />
                            Account
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Profile Visibility</p>
                                <p className="text-sm text-white/50">Control who can see your profile</p>
                            </div>
                            <select className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none">
                                <option>Everyone</option>
                                <option>Friends Only</option>
                                <option>Private</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Notifications */}
                <section className="bg-[#141118] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Bell size={20} className="text-[#7f19e6]" />
                            Notifications
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="font-medium">Push Notifications</p>
                            <div className="w-12 h-6 bg-[#7f19e6] rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Appearance */}
                <section className="bg-[#141118] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Moon size={20} className="text-[#7f19e6]" />
                            Appearance
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="font-medium">Dark Mode</p>
                            <div className="w-12 h-6 bg-[#7f19e6] rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
