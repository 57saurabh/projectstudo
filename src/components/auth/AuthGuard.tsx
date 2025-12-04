'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isInitialized } = useSelector((state: RootState) => state.auth);
    const router = useRouter();
    const pathname = usePathname();

    const publicPaths = ['/', '/login', '/signup'];

    useEffect(() => {
        if (!isInitialized) return;

        if (!isAuthenticated && !publicPaths.includes(pathname)) {
            router.push('/login');
        } else if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, isInitialized, pathname, router]);

    if (!isInitialized) {
        return <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white">Loading...</div>;
    }

    return <>{children}</>;
}
