'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Infinity, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';

interface Loop {
    _id: string;
    userId: {
        _id: string;
        displayName: string;
        username: string;
        avatarUrl: string;
    };
    mediaUrl: string;
    type: 'image' | 'video';
    views: number;
}

export default function Loops() {
    const { user } = useSelector((state: RootState) => state.auth);
    const [loops, setLoops] = useState<Loop[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchLoops = async () => {
        try {
            const res = await axios.get('/api/loops');
            setLoops(res.data);
        } catch (error) {
            console.error('Failed to fetch loops', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLoops();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

        try {
            // 1. Upload to Cloudinary (assuming client-side upload for speed)
            // Note: In a real app, you might want to sign this on the server
            const uploadRes = await axios.post(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
                formData
            );
            const mediaUrl = uploadRes.data.secure_url;
            const type = file.type.startsWith('video') ? 'video' : 'image';

            // 2. Create Loop in Backend
            const token = localStorage.getItem('token');
            await axios.post('/api/loops', {
                mediaUrl,
                type,
                caption: ''
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // 3. Refresh Loops
            await fetchLoops();
        } catch (error) {
            console.error('Upload failed', error);
            alert('Failed to upload loop');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileUpload}
            />

            {/* Add Loop Button */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className={`w-16 h-16 rounded-full p-[3px] border-2 border-dashed border-text-muted relative`}>
                    <div className="w-full h-full rounded-full bg-surface-hover flex items-center justify-center text-text-muted group-hover:text-gold transition-colors">
                        {uploading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                    </div>
                </div>
                <span className="text-xs font-bold text-text-secondary truncate w-full text-center group-hover:text-primary transition-colors">
                    Add Loop
                </span>
            </motion.div>

            {/* Render Loops */}
            {loops.map((loop, i) => (
                <motion.div
                    key={loop._id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group"
                >
                    <div className="w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-gold to-orange">
                        <div className="w-full h-full rounded-full bg-surface border-2 border-surface overflow-hidden relative flex items-center justify-center">
                            {loop.userId.avatarUrl ? (
                                <img
                                    src={loop.userId.avatarUrl}
                                    alt={loop.userId.displayName}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full bg-surface flex items-center justify-center text-gold font-bold">
                                    {loop.userId.displayName[0]}
                                </div>
                            )}
                        </div>
                    </div>
                    <span className="text-xs font-bold text-text-secondary truncate w-full text-center group-hover:text-primary transition-colors">
                        {loop.userId.displayName.split(' ')[0]}
                    </span>
                </motion.div>
            ))}
        </div>
    );
}
