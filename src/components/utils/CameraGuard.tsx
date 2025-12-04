'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCallStore } from '@/lib/store/useCallStore';

export const CameraGuard = () => {
    const pathname = usePathname();
    const localStream = useCallStore(state => state.localStream);
    const setLocalStream = useCallStore(state => state.setLocalStream);

    useEffect(() => {
        // List of paths where camera is allowed
        const isCallPage = pathname?.startsWith('/call');

        if (!isCallPage && localStream) {
            console.log('CameraGuard: Stopping camera on non-call page');
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
    }, [pathname, localStream, setLocalStream]);

    return null;
};
