'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Search, Send, ArrowLeft } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import axios from 'axios';
import { useSignaling } from '@/lib/webrtc/useSignaling';

interface Conversation {
    _id: string; // User ID of the other person
    user: {
        displayName: string;
        username: string;
        avatarUrl?: string;
    };
    lastMessage: {
        text: string;
        timestamp: string;
        senderId: string;
    };
}

interface Message {
    _id: string;
    senderId: string;
    receiverId: string;
    text: string;
    timestamp: string;
}

export default function MessagesPage() {
    const { user, token } = useSelector((state: RootState) => state.auth);
    const { socket, sendMessage } = useSignaling();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch Conversations
    useEffect(() => {
        const fetchConversations = async () => {
            if (!token) return;
            try {
                const res = await axios.get('/api/messages', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setConversations(res.data);
            } catch (error) {
                console.error('Failed to fetch conversations', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConversations();
    }, [token]);

    // Fetch Messages for Active Conversation
    useEffect(() => {
        const fetchMessages = async () => {
            if (!activeConversation || !token) return;
            try {
                const res = await axios.get(`/api/messages/${activeConversation._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessages(res.data);
                scrollToBottom();
            } catch (error) {
                console.error('Failed to fetch messages', error);
            }
        };
        fetchMessages();
    }, [activeConversation, token]);

    // Handle Real-time Messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (data: { senderId: string; text: string; senderName: string }) => {
            // If message is from the active conversation user
            if (activeConversation && data.senderId === activeConversation._id) {
                setMessages(prev => [...prev, {
                    _id: Date.now().toString(), // Temp ID
                    senderId: data.senderId,
                    receiverId: user?._id || '',
                    text: data.text,
                    timestamp: new Date().toISOString()
                }]);
                scrollToBottom();
            }

            // Update conversations list (Last Message)
            setConversations(prev => {
                const existing = prev.find(c => c._id === data.senderId);
                if (existing) {
                    return [
                        { ...existing, lastMessage: { text: data.text, timestamp: new Date().toISOString(), senderId: data.senderId } },
                        ...prev.filter(c => c._id !== data.senderId)
                    ];
                }
                // If new conversation (not in list), we might want to refetch or manually add if we have user details
                // For now, let's just refetch to be safe and simple
                // fetchConversations(); 
                return prev;
            });
        };

        socket.on('chat-message', handleNewMessage);

        return () => {
            socket.off('chat-message', handleNewMessage);
        };
    }, [socket, activeConversation, user]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !activeConversation || !user) return;

        // Optimistic Update
        const tempMsg: Message = {
            _id: Date.now().toString(),
            senderId: user._id,
            receiverId: activeConversation._id,
            text: inputText,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom();

        // Send via Socket
        sendMessage(activeConversation._id, inputText);

        // Update Conversation List
        setConversations(prev => {
            const existing = prev.find(c => c._id === activeConversation._id);
            if (existing) {
                return [
                    { ...existing, lastMessage: { text: inputText, timestamp: new Date().toISOString(), senderId: user._id } },
                    ...prev.filter(c => c._id !== activeConversation._id)
                ];
            }
            return prev;
        });

        setInputText('');
    };

    // Helper to decrypt if needed (frontend usually receives decrypted from API, but socket might be raw? 
    // Wait, socket sends raw text in 'chat-message' event from backend, so no decryption needed here)

    return (
        <div className="p-4 lg:p-8 h-screen text-text-primary flex flex-col transition-colors duration-300 overflow-hidden">
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Messages</h1>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden bg-surface border border-glass-border rounded-2xl shadow-xl">
                
                {/* Chat List */}
                <div className={`${activeConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-glass-border bg-surface/50`}>
                    <div className="p-4 border-b border-glass-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type="text"
                                placeholder="Search chats..."
                                className="w-full bg-glass-bg border border-glass-border rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary focus:outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {isLoading ? (
                            <div className="text-center p-4 text-text-secondary">Loading...</div>
                        ) : conversations.length === 0 ? (
                            <div className="text-center p-4 text-text-secondary">No conversations yet.</div>
                        ) : (
                            conversations.map((conv) => (
                                <div 
                                    key={conv._id} 
                                    onClick={() => setActiveConversation(conv)}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${activeConversation?._id === conv._id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-glass-bg border border-transparent'}`}
                                >
                                    <img 
                                        src={conv.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv._id}`} 
                                        alt={conv.user.displayName}
                                        className="w-10 h-10 rounded-full bg-gray-700 object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-medium truncate text-sm">{conv.user.displayName}</h4>
                                            <span className="text-xs text-text-secondary">
                                                {new Date(conv.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-text-secondary truncate">
                                            {conv.lastMessage.senderId === user?._id ? 'You: ' : ''}{conv.lastMessage.text}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                {activeConversation ? (
                    <div className={`${activeConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-surface`}>
                        {/* Header */}
                        <div className="p-4 border-b border-glass-border flex items-center gap-3 bg-surface/80 backdrop-blur-md">
                            <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 hover:bg-glass-bg rounded-full">
                                <ArrowLeft size={20} />
                            </button>
                            <img 
                                src={activeConversation.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConversation._id}`} 
                                alt={activeConversation.user.displayName}
                                className="w-10 h-10 rounded-full bg-gray-700 object-cover"
                            />
                            <div>
                                <h3 className="font-bold">{activeConversation.user.displayName}</h3>
                                <p className="text-xs text-green-500 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-glass-bg/30">
                            {messages.map((msg) => {
                                const isMe = msg.senderId === user?._id;
                                return (
                                    <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-surface border border-glass-border rounded-tl-none'}`}>
                                            <p className="text-sm">{msg.text}</p>
                                            <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-text-secondary'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-glass-border bg-surface">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-glass-bg border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50"
                                />
                                <button 
                                    type="submit"
                                    disabled={!inputText.trim()}
                                    className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="hidden md:flex flex-1 items-center justify-center flex-col text-text-secondary">
                        <div className="w-24 h-24 bg-glass-bg rounded-full flex items-center justify-center mb-6">
                            <MessageSquare size={48} className="text-primary/50" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">Your Messages</h3>
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}
