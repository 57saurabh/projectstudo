'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, signup } from '@/lib/store/authSlice';
import { AppDispatch, RootState } from '@/lib/store/store';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
    });

    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const { loading, error } = useSelector((state: RootState) => state.auth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLogin && formData.password !== formData.confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        const action = isLogin ? login : signup;
        const result = await dispatch(action({
            email: formData.email,
            password: formData.password
        }));

        if (login.fulfilled.match(result) || signup.fulfilled.match(result)) {
            router.push('/dashboard');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f6f8] dark:bg-[#0D0C10] font-sans relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#8b5cf633,transparent)] pointer-events-none" />

            <div className="relative z-10 w-full max-w-md flex flex-col items-center">
                {/* Logo */}
                <div className="mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold text-xl">Z</div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Zylo</h1>
                </div>

                {/* Card */}
                <div className="w-full bg-[#1A181D] border border-white/10 rounded-xl p-8 shadow-2xl shadow-[#8B5CF6]/10 backdrop-blur-md">

                    {/* Toggle */}
                    <div className="flex bg-black/30 p-1 rounded-lg mb-8">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/30' : 'text-gray-400 hover:text-white'}`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/30' : 'text-gray-400 hover:text-white'}`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-6 relative">
                        <h2 className="text-3xl font-black italic tracking-tighter text-white">
                            {isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
                        </h2>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#8B5CF6] rounded-full" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <div className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded">{error}</div>}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Email</label>
                            <input
                                type="email"
                                required
                                className="w-full bg-black/30 border-none rounded-lg p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#8B5CF6] transition-all"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full bg-black/30 border-none rounded-lg p-4 pr-12 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#8B5CF6] transition-all"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#8B5CF6]"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Confirm Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-black/30 border-none rounded-lg p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#8B5CF6] transition-all"
                                    placeholder="Confirm your password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold py-4 rounded-lg shadow-lg shadow-[#8B5CF6]/40 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? 'Loading...' : (isLogin ? 'LOGIN TO ZYLO' : 'JOIN ZYLO')}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                        <div className="w-2 h-2 bg-[#8B5CF6] rounded-full" />
                        <p>Your Email is <span className="font-bold text-white">never</span> shared. Ever.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
