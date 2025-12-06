'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { login, signup } from '@/lib/store/authSlice';
import { AppDispatch, RootState } from '@/lib/store/store';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import Input from '@/components/ui/Input';
import { GoogleLogin } from '@react-oauth/google';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '', // Kept for type compatibility but unused in UI
        username: ''     // Kept for type compatibility but unused in UI
    });

    // Removed username validation and suggestion effects as fields are removed

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
            password: formData.password,
            displayName: !isLogin ? formData.displayName : undefined,
            username: !isLogin ? formData.username : undefined
        }));

        if (login.fulfilled.match(result) || signup.fulfilled.match(result)) {
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-text-primary font-sans relative overflow-hidden transition-colors duration-300">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,rgba(216,154,26,0.15),transparent)] pointer-events-none" />

            <div className="relative z-10 w-full max-w-md flex flex-col items-center px-4 sm:px-0">
                {/* Logo */}
                <div className="mb-8 flex items-center gap-3">
                    <div className="h-16 flex items-center justify-center">
                        <img src="/logo.png" alt="Socialin" className="w-full h-full object-contain" />
                    </div>

                </div>

                {/* Card */}
                <div className="w-full bg-surface border border-border rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">

                    {/* Toggle */}
                    <div className="flex bg-surface-hover p-1.5 rounded-2xl mb-8 border border-border">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${isLogin ? 'bg-gold text-primary shadow-gold-glow' : 'text-text-muted hover:text-text-primary'}`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${!isLogin ? 'bg-gold text-primary shadow-gold-glow' : 'text-text-muted hover:text-text-primary'}`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8 relative">
                        <h2 className="text-3xl font-black italic tracking-tighter text-text-primary">
                            {isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
                        </h2>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gold rounded-full shadow-gold-glow" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && <div className="text-danger text-sm font-bold text-center bg-danger/10 p-3 rounded-xl border border-danger/20">{error}</div>}

                        {!isLogin && (
                            // Username and DisplayName are now auto-generated
                            // User can change them in profile settings
                            null
                        )}

                        <Input
                            label="Email Address"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="name@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />

                        <Input
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            required
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            rightElement={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-text-muted hover:text-gold transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            }
                        />

                        {!isLogin && (
                            <Input
                                label="Confirm Password"
                                type="password"
                                required
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gold hover:bg-gold-hover text-primary font-black py-4 rounded-2xl shadow-gold-glow transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-8 uppercase tracking-wide"
                        >
                            {loading ? 'Loading...' : (isLogin ? 'Login to Socialin' : 'Join Socialin')}
                        </button>
                    </form>

                    <div className="mt-8 relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-surface text-text-muted">Or continue with</span>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-center">
                        <GoogleLogin
                            onSuccess={async (credentialResponse) => {
                                try {
                                    const res = await axios.post('/api/auth/google', {
                                        credential: credentialResponse.credential
                                    });
                                    dispatch(login.fulfilled(res.data, 'google-login', { email: '', password: '' }));
                                    router.push('/');
                                } catch (err) {
                                    console.error('Google Login Failed', err);
                                    alert('Google Login Failed');
                                }
                            }}
                            onError={() => {
                                console.log('Login Failed');
                            }}
                            theme="filled_black"
                            shape="pill"
                            text="continue_with"
                            width="300"
                        />
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-2 text-xs text-text-muted font-medium">
                        <div className="w-2 h-2 bg-gold rounded-full shadow-gold-glow" />
                        <p>Your Email is <span className="font-bold text-text-primary">never</span> shared. Ever.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
