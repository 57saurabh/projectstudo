'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store/store';
import { verifyToken, setInitialized } from '@/lib/store/authSlice';

export default function AuthInitializer() {
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            dispatch(verifyToken(token));
        } else {
            dispatch(setInitialized(true));
        }
    }, [dispatch]);

    return null; // This component renders nothing
}
