'use client';

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Search, Send, ArrowLeft, Clock, Check, CheckCheck, Plus, Camera, Paperclip, X, Smile, Settings } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import axios from 'axios'; import { useSignaling } from '@/lib/webrtc/SignalingContext'; import GroupsView from '@/components/groups/GroupsView';
import EmojiPicker, { Theme } from 'emoji-picker-react';

type ConversationUser = {
    displayName: string;
    username: string;
    avatarUrl?: string;
};

type ConversationLastMessage = {
    text: string;
    timestamp: string;
    senderId: string;
};

type Conversation = {
    _id: string; // other user's id
    user: ConversationUser;
    lastMessage: ConversationLastMessage;
    unreadCount: number;
};

type Message = {
    _id: string;
    senderId: string;
    receiverId?: string; // Optional in some contexts?
    text: string;
    timestamp: string;
    status?: 'pending' | 'sent' | 'read';
    senderName?: string;
    senderAvatar?: string;
    type?: 'text' | 'image' | 'video';
    mediaData?: string;
};

export default function MessagesPage() {
    const { user, token } = useSelector((state: RootState) => state.auth);
    const { socket, sendMessage, markAsRead } = useSignaling();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    const [canSend, setCanSend] = useState(true);
    const [friendRequestStatus, setFriendRequestStatus] = useState<'none' | 'pending' | 'accepted' | 'received'>('none');
    const [requestId, setRequestId] = useState<string | undefined>(undefined);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats');

    // --- Media & UI State ---
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

    const handleEmojiClick = (emojiData: any) => {
        setInputText((prev) => prev + emojiData.emoji);
        // Don't close picker immediately, allow multiple emojis? User preference. keeping it open or closed. User usually expects one close. 
        // Let's keep it open for now or toggle? The plan doesn't specify. I'll keep it open.
    };

    const sendMediaMessage = async (type: 'image' | 'video', base64Data: string, caption = '') => {
        if (!activeConversation || !user) return;
        const now = new Date().toISOString();

        // Optimistic Update
        const tempMsg: Message = {
            _id: Date.now().toString(),
            senderId: user._id,
            receiverId: activeConversation._id,
            text: caption,
            type: type,
            mediaData: base64Data,
            timestamp: now,
            status: 'pending',
            senderName: user.displayName || 'You',
            senderAvatar: user.avatarUrl
        };
        setMessages((prev) => [...prev, tempMsg]);
        scrollToBottom();

        // Socket Emit
        socket?.emit('chat-message', {
            chatId: activeConversation._id,
            receiverId: activeConversation._id,
            text: caption,
            type: type,
            mediaData: base64Data
        });

        // Update Convo List
        setConversations((prev) => {
            const existing = prev.find((c) => c._id === activeConversation._id);
            if (existing) {
                return [
                    { ...existing, lastMessage: { text: type === 'image' ? '📷 Image' : '🎥 Video', timestamp: now, senderId: user._id }, unreadCount: 0 },
                    ...prev.filter(c => c._id !== activeConversation._id)
                ];
            }
            return prev;
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 4 * 1024 * 1024) {
            alert('File too large. Max 4MB.');
            return;
        }

        const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
        if (!type) {
            alert('Only images and videos are supported.');
            return;
        }

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            sendMediaMessage(type, base64);
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
        };
        reader.readAsDataURL(file);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStream(stream);
            setShowCameraModal(true);
        } catch (err) {
            console.error('Camera access denied:', err);
            alert('Could not access camera. Please allow permissions.');
        }
    };

    const stopCamera = () => {
        cameraStream?.getTracks().forEach(track => track.stop());
        setCameraStream(null);
        setShowCameraModal(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        canvas.getContext('2d')?.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        sendMediaMessage('image', dataUrl);
        stopCamera();
    };

    // Track online users
    useEffect(() => {
        if (!socket) return;

        const handleOnlineUsers = (users: any[]) => {
            const onlineUserIds = new Set(
                users
                    .filter((u) => u.userId)
                    .map((u) => u.userId as string)
            );
            setOnlineUsers(onlineUserIds);
        };

        socket.emit('get-online-users');
        socket.on('online-users-list', handleOnlineUsers);

        return () => {
            socket.off('online-users-list', handleOnlineUsers);
        };
    }, [socket]);

    // Fetch Conversations
    useEffect(() => {
        const fetchConversations = async () => {
            if (!token) return;
            try {
                const res = await axios.get('/api/messages', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Expect backend to already return in Conversation shape,
                // if not, you can map here.
                // Deduplicate conversations based on user ID
                const uniqueConversations = res.data.filter((conv: Conversation, index: number, self: Conversation[]) =>
                    index === self.findIndex((c) => c._id === conv._id)
                );
                setConversations(uniqueConversations);
                console.log('Fetched conversations:', res.data);

                // Auto-open chat if ?userId=... in URL
                const urlParams = new URLSearchParams(window.location.search);
                const targetUserId = urlParams.get('userId');

                if (targetUserId) {
                    const existing: Conversation | undefined = res.data.find(
                        (c: Conversation) => c._id === targetUserId
                    );

                    if (existing) {
                        setActiveConversation(existing);
                    } else {
                        try {
                            const userRes = await axios.get(`/api/users/${targetUserId}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });

                            const newUser = userRes.data;
                            const newConv: Conversation = {
                                _id: newUser._id,
                                user: {
                                    displayName: newUser.displayName,
                                    username: newUser.username,
                                    avatarUrl: newUser.avatarUrl
                                },
                                lastMessage: {
                                    text: '',
                                    timestamp: new Date().toISOString(),
                                    senderId: ''
                                },
                                unreadCount: 0
                            };

                            setConversations((prev) => {
                                if (prev.some((c) => c._id === newConv._id)) return prev;
                                return [newConv, ...prev];
                            });
                            setActiveConversation(newConv);
                        } catch (err) {
                            console.error('Failed to fetch user for new chat', err);
                        }
                    }

                    // Clean URL
                    window.history.replaceState({}, '', '/messages');
                }
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

                setMessages(res.data.messages);
                setCanSend(res.data.canSend);
                setFriendRequestStatus(res.data.requestStatus);
                setRequestId(res.data.requestId);
                scrollToBottom();

                // Mark as read if there are unread messages
                if (activeConversation.unreadCount > 0) {
                    markAsRead(activeConversation._id);

                    setConversations((prev) =>
                        prev.map((c) =>
                            c._id === activeConversation._id
                                ? { ...c, unreadCount: 0 }
                                : c
                        )
                    );
                }
            } catch (error) {
                console.error('Failed to fetch messages', error);
            }
        };

        fetchMessages();
    }, [activeConversation, token, markAsRead]);

    // Handle Friend Request Actions
    const backendUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

    const sendFriendRequest = async () => {
        if (!activeConversation || !user) return;
        try {
            await axios.post(`${backendUrl}/friend-request/send`, {
                senderId: user._id,
                receiverId: activeConversation._id
            });
            setFriendRequestStatus('pending');
            alert('Friend request sent!');
        } catch (error: any) {
            console.error('Failed to send friend request', error);
            const msg =
                error.response?.data?.message ||
                'Failed to send friend request';
            alert(msg);
            if (msg === 'Friend request already pending') {
                setFriendRequestStatus('pending');
            }
        }
    };

    const acceptFriendRequest = async () => {
        if (!requestId || !user) return;
        try {
            await axios.post(`${backendUrl}/friend-request/accept`, {
                requestId: requestId,
                userId: user._id
            });
            setFriendRequestStatus('accepted');
            setCanSend(true);
            alert('Friend request accepted!');
        } catch (error: any) {
            console.error('Failed to accept friend request', error);
            alert(error.response?.data?.message || 'Failed to accept request');
        }
    };

    // Listen for friendship approval (real-time via WebRTC signaling socket)
    useEffect(() => {
        if (!socket) return;

        const handleFriendshipApproved = (data: { friendId: string }) => {
            if (activeConversation && data.friendId === activeConversation._id) {
                setCanSend(true);
                setFriendRequestStatus('accepted');
            }
        };

        socket.on('friendship_approved', handleFriendshipApproved);

        return () => {
            socket.off('friendship_approved', handleFriendshipApproved);
        };
    }, [socket, activeConversation]);

    const playNotificationSound = () => {
        // const audio = new Audio('/notification.mp3');
        // audio.play().catch(err => {
        //     if (err.name !== 'NotAllowedError') {
        //         console.error('Error playing sound:', err);
        //     }
        // });
        console.log('New message received (Sound disabled: notification.mp3 missing)');
    };

    type Message = {
        _id: string;
        senderId: string;
        receiverId?: string; // Optional in some contexts?
        text: string;
        timestamp: string;
        status?: 'pending' | 'sent' | 'delivered' | 'seen';
        senderName?: string;
        senderAvatar?: string;
        type?: 'text' | 'image' | 'video';
        mediaData?: string;
        fileUrl?: string;
    };

    // ... inside component ...

    // Handle Real-time Messages over the same signaling socket (chat + WebRTC)
    const handleNewMessage = useCallback(async (data: {
        senderId: string;
        text: string;
        senderName: string;
        senderAvatar?: string;
        timestamp?: string;
        type?: 'text' | 'image' | 'video';
        mediaData?: string;
        fileUrl?: string;
        status?: 'sent' | 'delivered' | 'seen';
    }) => {
        console.log(`Received chat-message from ${data.senderName}:`, { ...data, mediaData: data.mediaData ? 'Base64<...>' : undefined });
        const msgTimestamp = data.timestamp || new Date().toISOString();

        // 1. Active Chat Update
        if (activeConversation && data.senderId === activeConversation._id) {
            setMessages((prev) => [
                ...prev,
                {
                    _id: Date.now().toString(),
                    senderId: data.senderId,
                    receiverId: user?._id || '',
                    text: data.text,
                    timestamp: msgTimestamp,
                    senderName: data.senderName,
                    senderAvatar: data.senderAvatar,
                    type: data.type || 'text',
                    mediaData: data.mediaData,
                    fileUrl: data.fileUrl,
                    status: data.status || 'sent'
                }
            ]);
            scrollToBottom();

            // Mark as seen immediately if active
            markAsRead(data.senderId);

        } else {
            playNotificationSound();
        }

        // 2. Conversation List Update
        // Check current state directly since we have it fresh in deps
        const existing = conversations.find((c) => c._id === data.senderId);

        if (existing) {
            const isChatOpen = !!activeConversation && activeConversation._id === data.senderId;

            setConversations((prev) => {
                const target = prev.find((c) => c._id === data.senderId);
                if (!target) return prev;

                const updated: Conversation = {
                    ...target,
                    lastMessage: {
                        text: data.type === 'image' ? '📷 Image' : data.type === 'video' ? '🎥 Video' : data.text,
                        timestamp: msgTimestamp,
                        senderId: data.senderId
                    },
                    unreadCount: isChatOpen
                        ? 0
                        : (target.unreadCount || 0) + 1
                };

                // Move updated conversation to top
                return [
                    updated,
                    ...prev.filter((c) => c._id !== data.senderId)
                ];
            });
        } else if (token) {
            // New conversation
            try {
                const userRes = await axios.get(`/api/users/${data.senderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const newUser = userRes.data;
                const newConv: Conversation = {
                    _id: newUser._id,
                    user: {
                        displayName: newUser.displayName,
                        username: newUser.username,
                        avatarUrl: newUser.avatarUrl
                    },
                    lastMessage: {
                        text: data.type === 'image' ? '📷 Image' : data.type === 'video' ? '🎥 Video' : data.text,
                        timestamp: msgTimestamp,
                        senderId: data.senderId
                    },
                    unreadCount: 1
                };

                setConversations((prev) => {
                    if (prev.some((c) => c._id === newConv._id)) return prev;
                    return [newConv, ...prev];
                });
            } catch (err) {
                console.error('Failed to fetch user for new message', err);
            }
        }
    }, [activeConversation, conversations, user, token, markAsRead]);

    useEffect(() => {
        if (!socket || !user) return;

        socket.on('chat-message', handleNewMessage);

        const handleMessageSent = (data: { conversationId: string, text: string, timestamp: string, receiverId: string }) => {
            // Correct 'pending' to 'sent'
            // Backend might look up by ID or we just match roughly by text/time (risky) OR just update all pending?
            // Actually, 'message-delivered' provides messageId if we tracked it, but we use Date.now() as temp ID.
            // Best effort: Update pending messages that match receiver.

            if (activeConversation && activeConversation._id === data.receiverId) {
                setMessages(prev => prev.map(msg =>
                    msg.status === 'pending'
                        ? { ...msg, status: 'sent', timestamp: data.timestamp } // Update to sent
                        : msg
                ));
            }
        };

        const handleMessageDelivered = (data: { chatId: string, receiverId: string, messageId?: string }) => {
            if (activeConversation && activeConversation._id === data.receiverId) {
                setMessages(prev => prev.map(msg =>
                    (msg.status === 'sent' || msg.status === 'pending') && msg.senderId === user._id
                        ? { ...msg, status: 'delivered' }
                        : msg
                ));
            }
        };

        const handleMessageSeen = (data: { readerId: string, conversationId: string }) => {
            // If I am looking at chat with 'readerId', my messages to them are now seen.
            if (activeConversation && activeConversation._id === data.readerId) {
                setMessages(prev => prev.map(msg =>
                    msg.senderId === user._id && msg.status !== 'seen' ? { ...msg, status: 'seen' } : msg
                ));
            }
        };

        socket.on('message-sent', handleMessageSent); // Keep legacy if backend emits it
        socket.on('message-delivered', handleMessageDelivered);
        socket.on('message-seen', handleMessageSeen);

        return () => {
            socket.off('chat-message', handleNewMessage);
            socket.off('message-sent', handleMessageSent);
            socket.off('message-delivered', handleMessageDelivered);
            socket.off('message-seen', handleMessageSeen);
        };
    }, [socket, activeConversation, user, token, markAsRead, handleNewMessage]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !activeConversation || !user) return;

        const now = new Date().toISOString();

        // Optimistic Update
        const tempMsg: Message = {
            _id: Date.now().toString(),
            senderId: user._id,
            receiverId: activeConversation._id,
            text: inputText,
            timestamp: now,
            status: 'pending',
            senderName: user.displayName || 'You',
            senderAvatar: user.avatarUrl
        };

        setMessages((prev) => [...prev, tempMsg]);
        scrollToBottom();

        // Send via common WebRTC signaling socket
        sendMessage(activeConversation._id, inputText);

        // Update Conversation List (last message + bump to top)
        setConversations((prev) => {
            const existing = prev.find((c) => c._id === activeConversation._id);

            if (existing) {
                const updated: Conversation = {
                    ...existing,
                    lastMessage: {
                        text: inputText,
                        timestamp: now,
                        senderId: user._id
                    },
                    unreadCount: 0
                };

                return [
                    updated,
                    ...prev.filter((c) => c._id !== activeConversation._id)
                ];
            }

            return prev;
        });

        setInputText('');
    };

    // Fetch Friends for New Chat
    const fetchFriends = async () => {
        if (!token) return;
        try {
            const res = await axios.get('/api/friends', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriends(res.data);
        } catch (error) {
            console.error('Failed to fetch friends', error);
        }
    };

    const handleStartNewChat = () => {
        fetchFriends();
        setShowNewChatModal(true);
    };

    const selectFriendForChat = (friend: any) => {
        const existing = conversations.find((c) => c._id === friend._id);

        if (existing) {
            setActiveConversation(existing);
        } else {
            const newConv: Conversation = {
                _id: friend._id,
                user: {
                    displayName: friend.displayName,
                    username: friend.username,
                    avatarUrl: friend.avatarUrl
                },
                lastMessage: {
                    text: '',
                    timestamp: new Date().toISOString(),
                    senderId: ''
                },
                unreadCount: 0
            };

            setConversations((prev) => {
                if (prev.some((c) => c._id === newConv._id)) return prev;
                return [newConv, ...prev];
            });

            setActiveConversation(newConv);
        }

        setShowNewChatModal(false);
    };

    return (
        <div className="p-4 lg:p-8 h-full bg-background text-text-primary flex flex-col transition-colors duration-300 overflow-hidden">
            <div className="mb-6 flex justify-between items-center">

                {/* Tab Switcher */}
                <div className="flex bg-surface border border-border rounded-xl p-1">
                    <button
                        onClick={() => setActiveTab('chats')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'chats'
                            ? 'bg-gold text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Chats
                    </button>
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'groups'
                            ? 'bg-gold text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Groups
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => alert("Settings: Working in it")}
                        className="px-4 py-2 bg-surface-hover border border-border text-text-primary rounded-xl text-sm font-bold hover:border-gold hover:text-gold transition-all active:scale-95"
                    >
                        <Settings size={18} />
                    </button>
                    <button
                        onClick={handleStartNewChat}
                        className="px-4 py-2 bg-surface-hover border border-border text-text-primary rounded-xl text-sm font-bold hover:border-gold hover:text-gold transition-all active:scale-95"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden bg-surface border border-border rounded-3xl shadow-2xl relative min-h-0">
                {/* New Chat Modal */}
                {showNewChatModal && (
                    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-surface border border-border rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
                            <div className="p-6 border-b border-border flex justify-between items-center">
                                <h3 className="font-bold text-xl">Start New Chat</h3>
                                <button
                                    onClick={() => setShowNewChatModal(false)}
                                    className="p-2 hover:bg-surface-hover rounded-full transition-colors"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                                {friends.length === 0 ? (
                                    <div className="text-center p-8 text-text-muted">
                                        No friends found. Add friends first!
                                    </div>
                                ) : (
                                    friends.map((friend) => (
                                        <button
                                            key={friend._id}
                                            onClick={() => selectFriendForChat(friend)}
                                            className="w-full flex items-center gap-4 p-4 hover:bg-surface-hover rounded-2xl transition-colors text-left border-b border-border/50 last:border-0"
                                        >
                                            <img
                                                src={
                                                    friend.avatarUrl ||
                                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend._id}`
                                                }
                                                alt={friend.displayName}
                                                className="w-12 h-12 rounded-full bg-background object-cover border border-border"
                                            />
                                            <div>
                                                <p className="font-bold text-lg">
                                                    {friend.displayName}
                                                </p>
                                                <p className="text-xs text-text-muted font-medium">
                                                    @{friend.username}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'groups' ? (
                    <div className="w-full p-6">
                        <GroupsView />
                    </div>
                ) : (
                    <>
                        {/* Chat List */}
                        <div
                            className={`${activeConversation ? 'hidden md:flex' : 'flex'
                                } w-full md:w-80 lg:w-96 flex-col border-r border-border bg-surface min-h-0`}
                        >
                            <div className="p-6 border-b border-border">
                                <div className="relative">
                                    <Search
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                                        size={18}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search chats..."
                                        className="w-full bg-surface-hover border border-border rounded-2xl py-3 pl-12 pr-4 text-sm text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide min-h-0">
                                {isLoading ? (
                                    <div className="text-center p-4 text-text-muted">
                                        Loading...
                                    </div>
                                ) : conversations.length === 0 ? (
                                    <div className="text-center p-4 text-text-muted">
                                        No conversations yet.
                                    </div>
                                ) : (
                                    conversations.map((conv) => {
                                        const lastMessage = conv.lastMessage;
                                        const lastMessageTime = lastMessage?.timestamp
                                            ? new Date(
                                                lastMessage.timestamp
                                            ).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            : '';

                                        const lastText =
                                            lastMessage?.text?.trim() || 'No messages yet';

                                        const fromMe =
                                            lastMessage?.senderId &&
                                            user &&
                                            lastMessage.senderId === user._id;

                                        if (!conv.user) return null;

                                        return (
                                            <div
                                                key={conv._id}
                                                onClick={() => setActiveConversation(conv)}
                                                className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 ${activeConversation?._id === conv._id
                                                    ? 'bg-gold/10 border border-gold/30 shadow-sm'
                                                    : 'hover:bg-surface-hover border border-transparent'
                                                    }`}
                                            >
                                                <div className="relative">
                                                    <img
                                                        src={
                                                            conv.user.avatarUrl ||
                                                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv._id}`
                                                        }
                                                        alt={conv.user.displayName}
                                                        className="w-12 h-12 rounded-full bg-background object-cover border border-border"
                                                    />
                                                    {onlineUsers.has(conv._id) && (
                                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-orange rounded-full border-2 border-surface shadow-orange-glow"></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className={`font-bold truncate text-base ${activeConversation?._id === conv._id ? 'text-gold' : 'text-text-primary'}`}>
                                                            {conv.user.displayName}
                                                        </h4>
                                                        {lastMessageTime && (
                                                            <span className="text-xs text-text-muted font-medium">
                                                                {lastMessageTime}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <p
                                                            className={`text-sm truncate ${conv.unreadCount > 0
                                                                ? 'font-bold text-text-primary'
                                                                : 'text-text-secondary'
                                                                }`}
                                                        >
                                                            {fromMe ? 'You: ' : ''}
                                                            {lastText}
                                                        </p>
                                                        {conv.unreadCount > 0 && (
                                                            <span className="bg-gold text-primary text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center ml-2 shadow-gold-glow">
                                                                {conv.unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Chat Area */}
                        {activeConversation ? (
                            <div
                                className={`${activeConversation ? 'flex' : 'hidden md:flex'
                                    } flex-1 flex-col bg-surface`}
                            >
                                {/* Header */}
                                <div className="p-4 border-b border-border flex items-center gap-4 bg-surface/90 backdrop-blur-md z-10 shadow-sm">
                                    <button
                                        onClick={() => setActiveConversation(null)}
                                        className="md:hidden p-2 hover:bg-surface-hover rounded-full"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <img
                                        src={
                                            activeConversation.user.avatarUrl ||
                                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConversation._id}`
                                        }
                                        alt={activeConversation.user.displayName}
                                        className="w-10 h-10 rounded-full bg-background object-cover border border-border"
                                    />
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">
                                            {activeConversation.user.displayName}
                                        </h3>
                                        <p
                                            className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${onlineUsers.has(activeConversation._id)
                                                ? 'text-orange'
                                                : 'text-text-muted'
                                                }`}
                                        >
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${onlineUsers.has(
                                                    activeConversation._id
                                                )
                                                    ? 'bg-orange animate-pulse'
                                                    : 'bg-text-secondary'
                                                    }`}
                                            ></span>
                                            {onlineUsers.has(activeConversation._id)
                                                ? 'Online'
                                                : 'Offline'}
                                        </p>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface min-h-0">
                                    {messages.map((msg) => {
                                        const isMe = msg.senderId === user?._id;

                                        // Determine Avatar & Name
                                        // Prioritize message-specific data (snapshots), fallback to current user/partner state
                                        const avatarUrl = msg.senderAvatar
                                            || (isMe
                                                ? (user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?._id}`)
                                                : (activeConversation.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConversation._id}`));

                                        const displayName = msg.senderName
                                            || (isMe
                                                ? (user?.displayName || 'You')
                                                : (activeConversation.user.displayName || 'Partner'));

                                        return (
                                            <div key={msg._id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                {/* Avatar */}
                                                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                                    <img
                                                        src={avatarUrl}
                                                        className="w-8 h-8 rounded-full bg-surface-hover object-cover border border-border"
                                                        alt="avatar"
                                                    />
                                                </div>

                                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                                    {/* Username */}
                                                    <span className="text-[10px] text-text-muted mb-1 px-1 opacity-70">
                                                        {displayName}
                                                    </span>

                                                    {/* Bubble or Media */}
                                                    <div className={`rounded-2xl shadow-sm overflow-hidden ${isMe
                                                        ? 'bg-gold text-primary rounded-tr-none shadow-gold-glow/20'
                                                        : 'bg-surface-hover text-text-primary rounded-tl-none border border-border'
                                                        } ${msg.type && msg.type !== 'text' ? 'p-2' : 'px-5 py-3'}`}>

                                                        {msg.type === 'image' && (msg.mediaData || msg.fileUrl) ? (
                                                            <img
                                                                src={msg.mediaData || msg.fileUrl}
                                                                alt="Shared image"
                                                                className="rounded-xl max-w-[200px] md:max-w-xs object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                                                onClick={() => window.open(msg.mediaData || msg.fileUrl, '_blank')}
                                                            />
                                                        ) : msg.type === 'video' && (msg.mediaData || msg.fileUrl) ? (
                                                            <video
                                                                src={msg.mediaData || msg.fileUrl}
                                                                controls
                                                                className="rounded-xl max-w-[200px] md:max-w-xs"
                                                            />
                                                        ) : (
                                                            <div className="text-sm leading-relaxed whitespace-pre-wrap word-break-break-word">
                                                                {msg.text}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Time & Status */}
                                                    <div className="flex items-center gap-1 mt-1 px-1 opacity-60">
                                                        <p className="text-[10px] font-bold">
                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {isMe && (
                                                            <div className="flex items-center ml-1">
                                                                {msg.status === 'pending' && <Clock size={12} className="text-text-muted" />}
                                                                {msg.status === 'sent' && <Check size={14} className="text-text-muted" />}
                                                                {msg.status === 'delivered' && <CheckCheck size={14} className="text-text-muted" />}
                                                                {msg.status === 'seen' && <CheckCheck size={14} className="text-blue-400" />}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input or Friend Request */}
                                {canSend ? (
                                    <>
                                        {/* Camera Modal */}
                                        {showCameraModal && (
                                            <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
                                                <button onClick={stopCamera} className="absolute top-6 right-6 text-text-primary p-3 bg-surface/50 backdrop-blur-sm rounded-full hover:bg-surface-hover transition-all border border-border">
                                                    <X size={24} />
                                                </button>

                                                <div className="relative w-full max-w-lg aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-8">
                                                    <video
                                                        ref={videoRef}
                                                        autoPlay
                                                        playsInline
                                                        muted
                                                        className="w-full h-full object-cover transform scale-x-[-1]"
                                                        onLoadedMetadata={() => videoRef.current?.play()}
                                                    />
                                                </div>

                                                <button
                                                    onClick={capturePhoto}
                                                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/20"
                                                >
                                                    <div className="w-16 h-16 bg-text-primary rounded-full" />
                                                </button>
                                                <canvas ref={canvasRef} className="hidden" />
                                            </div>
                                        )}

                                        <div className="relative p-4 border-t border-border bg-surface">
                                            {/* Emoji Picker Popover */}
                                            {showEmojiPicker && (
                                                <div className="absolute bottom-24 left-4 z-20 shadow-2xl rounded-2xl border border-border overflow-hidden">
                                                    <EmojiPicker
                                                        theme={Theme.DARK}
                                                        onEmojiClick={handleEmojiClick}
                                                        width={320}
                                                        height={400}
                                                    />
                                                </div>
                                            )}

                                            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    accept="image/*,video/*"
                                                    onChange={handleFileSelect}
                                                />

                                                {/* Attachment Actions */}
                                                <div className="flex gap-1">
                                                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-3 text-text-secondary hover:text-gold hover:bg-surface-hover rounded-xl transition-all">
                                                        <Smile size={22} />
                                                    </button>
                                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-text-secondary hover:text-gold hover:bg-surface-hover rounded-xl transition-all">
                                                        <Paperclip size={22} />
                                                    </button>
                                                    <button type="button" onClick={startCamera} className="p-3 text-text-secondary hover:text-gold hover:bg-surface-hover rounded-xl transition-all">
                                                        <Camera size={22} />
                                                    </button>
                                                </div>

                                                {/* Text Input */}
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="text"
                                                        value={inputText}
                                                        onChange={(e) => setInputText(e.target.value)}
                                                        placeholder="Type a message..."
                                                        className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all font-medium text-text-primary placeholder-text-muted"
                                                    />
                                                </div>

                                                {/* Send Button */}
                                                <button
                                                    type="submit"
                                                    disabled={!inputText.trim() && !isUploading}
                                                    className="p-3.5 bg-gold text-primary rounded-xl hover:bg-gold-hover shadow-gold-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0"
                                                >
                                                    {isUploading ? (
                                                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <Send size={20} />
                                                    )}
                                                </button>
                                            </form>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-6 border-t border-border bg-surface flex flex-col items-center justify-center gap-4">
                                        <p className="text-sm text-text-muted font-medium">
                                            You can only chat with friends.
                                        </p>
                                        {friendRequestStatus === 'pending' ? (
                                            <button
                                                disabled
                                                className="px-6 py-3 bg-surface-hover border border-border text-text-muted rounded-2xl text-sm font-bold cursor-not-allowed"
                                            >
                                                Request Sent
                                            </button>
                                        ) : friendRequestStatus === 'received' ? (
                                            <button
                                                onClick={acceptFriendRequest}
                                                className="px-6 py-3 bg-green-500 text-white rounded-2xl text-sm font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                                            >
                                                Accept Friend Request
                                            </button>
                                        ) : (
                                            <button
                                                onClick={sendFriendRequest}
                                                className="px-6 py-3 bg-gold text-primary rounded-2xl text-sm font-bold hover:bg-gold-hover shadow-gold-glow transition-all active:scale-95"
                                            >
                                                Send Friend Request
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="hidden md:flex flex-1 items-center justify-center flex-col text-text-secondary bg-surface/50">
                                <div className="w-24 h-24 bg-surface-hover rounded-full flex items-center justify-center mb-6 shadow-orange-glow">
                                    <MessageSquare size={40} className="text-gold" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
                                    Your Messages
                                </h3>
                                <p className="text-text-muted font-medium">Select a conversation to start chatting</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
