'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { Loader2 } from 'lucide-react';

export default function ProfileRedirectPage() {
    const router = useRouter();
    const { user } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        if (user?.username) {
            router.replace(`/profile/${user.username}`);
        }
    }, [user, router]);

    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <Loader2 size={40} className="animate-spin text-gold" />
        </div>
    );
}
