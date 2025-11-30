'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store/store';
import { verifyToken } from '@/lib/store/authSlice';

export default function AuthInitializer() {
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            dispatch(verifyToken(token));
        }
    }, [dispatch]);

    return null; // This component renders nothing
}
