import { useState, useEffect, useRef } from 'react';
import { Send, Globe, Youtube, Instagram } from 'lucide-react';
import axios from 'axios';

interface Comment {
    id: string;
    source: 'internal' | 'youtube' | 'instagram';
    username: string;
    message: string;
    timestamp: string;
}

interface LiveChatProps {
    sessionId: string;
}

export default function LiveChat({ sessionId }: LiveChatProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Poll for comments every 3 seconds
        const interval = setInterval(fetchComments, 3000);
        return () => clearInterval(interval);
    }, [sessionId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const fetchComments = async () => {
        try {
            const res = await axios.get(`/api/live/${sessionId}/comments`);
            // In a real app, we'd merge/dedupe, but for mock we just replace
            setComments(res.data);
        } catch (error) {
            console.error('Failed to fetch comments', error);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        // Optimistic update
        const tempComment: Comment = {
            id: Date.now().toString(),
            source: 'internal',
            username: 'Me',
            message: newMessage,
            timestamp: new Date().toISOString()
        };
        setComments(prev => [...prev, tempComment]);
        setNewMessage('');

        // TODO: Send to backend API
    };

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md border-l border-white/10 w-80">
            <div className="p-4 border-b border-white/10">
                <h3 className="font-bold text-white">Live Chat</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            {comment.source === 'internal' && <Globe size={12} className="text-primary" />}
                            {comment.source === 'youtube' && <Youtube size={12} className="text-red-500" />}
                            {comment.source === 'instagram' && <Instagram size={12} className="text-pink-500" />}
                            <span className="text-xs font-bold text-gray-300">{comment.username}</span>
                        </div>
                        <p className="text-sm text-white break-words">{comment.message}</p>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-white/10">
                <div className="relative">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Say something..."
                        className="w-full bg-white/10 border border-white/10 rounded-full px-4 py-2 pr-10 text-sm text-white focus:outline-none focus:border-primary placeholder:text-gray-500"
                    />
                    <button 
                        type="submit"
                        className="absolute right-1 top-1 p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </form>
        </div>
    );
}
