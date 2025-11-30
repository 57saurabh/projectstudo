'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { IUser as User } from '@/models/User';
import WebcamCapture from '@/components/profile/WebcamCapture';
import { Camera, Save, Loader2, User as UserIcon, Globe, Briefcase, Hash } from 'lucide-react';
import axios from 'axios';
import { setUser } from '@/lib/store/authSlice';

export default function ProfilePage() {
    const { user, token } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();

    const [formData, setFormData] = useState<Partial<User>>({});
    const [isCapturing, setIsCapturing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName,
                username: user.username,
                bio: user.bio,
                website: user.website,
                profession: user.profession,
                gender: user.gender,
                age: user.age,
                country: user.country,
                language: user.language,
                avatarUrl: user.avatarUrl
            });
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: Partial<User>) => ({ ...prev, [name]: value }));
    };

    const handleAvatarCapture = (imageSrc: string) => {
        setFormData((prev: Partial<User>) => ({ ...prev, avatarUrl: imageSrc }));
        setIsCapturing(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            // In a real app, we'd use the token for auth. 
            // For now, we might need to pass userId in headers if backend expects it, 
            // or rely on the token if auth middleware is set up.
            // Based on previous files, we might need x-user-id header or similar if no proper auth middleware.
            // But let's try standard Bearer token first, assuming axios interceptor or manual header.

            const headers = token ? { Authorization: `Bearer ${token}` } : { 'x-user-id': user?._id || user?.id };

            const response = await axios.put(`/api/user/me`, formData, {
                headers
            });

            dispatch(setUser(response.data));
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return <div className="p-8 text-white">Please log in to view this page.</div>;
    }

    return (
        <div className="relative min-h-screen bg-[#191121] text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Avatar */}
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-[#7f19e6] bg-black/50 group">
                            {formData.avatarUrl ? (
                                <img src={formData.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/20">
                                    <UserIcon size={64} />
                                </div>
                            )}

                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setIsCapturing(true)}>
                                <Camera className="text-white" size={32} />
                            </div>
                        </div>

                        <button
                            onClick={() => setIsCapturing(true)}
                            className="text-[#7f19e6] font-medium hover:text-[#6d14c4] transition-colors"
                        >
                            Change Profile Photo
                        </button>

                        {isCapturing && (
                            <WebcamCapture
                                onCapture={handleAvatarCapture}
                                onCancel={() => setIsCapturing(false)}
                            />
                        )}
                    </div>

                    {/* Right Column: Form */}
                    <div className="md:col-span-2">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {message && (
                                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/60">Display Name</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                        <input
                                            type="text"
                                            name="displayName"
                                            value={formData.displayName || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-[#7f19e6] focus:ring-1 focus:ring-[#7f19e6] outline-none transition-colors"
                                            placeholder="Your Name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/60">Username</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-[#7f19e6] focus:ring-1 focus:ring-[#7f19e6] outline-none transition-colors"
                                            placeholder="username"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium text-white/60">Bio</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio || ''}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#7f19e6] focus:ring-1 focus:ring-[#7f19e6] outline-none transition-colors resize-none"
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/60">Profession</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                        <input
                                            type="text"
                                            name="profession"
                                            value={formData.profession || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-[#7f19e6] focus:ring-1 focus:ring-[#7f19e6] outline-none transition-colors"
                                            placeholder="Software Engineer"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/60">Website</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                        <input
                                            type="text"
                                            name="website"
                                            value={formData.website || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-[#7f19e6] focus:ring-1 focus:ring-[#7f19e6] outline-none transition-colors"
                                            placeholder="https://example.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/60">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender || ''}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#7f19e6] focus:ring-1 focus:ring-[#7f19e6] outline-none transition-colors appearance-none"
                                    >
                                        <option value="" className="bg-[#191121]">Select Gender</option>
                                        <option value="male" className="bg-[#191121]">Male</option>
                                        <option value="female" className="bg-[#191121]">Female</option>
                                        <option value="other" className="bg-[#191121]">Other</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/60">Age</label>
                                    <input
                                        type="number"
                                        name="age"
                                        value={formData.age || ''}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#7f19e6] focus:ring-1 focus:ring-[#7f19e6] outline-none transition-colors"
                                        placeholder="25"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#7f19e6] text-white font-bold hover:bg-[#6d14c4] transition-colors shadow-lg shadow-[#7f19e6]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
