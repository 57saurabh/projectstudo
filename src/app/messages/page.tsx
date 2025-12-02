'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Search, Send, ArrowLeft, Clock, Check, CheckCheck } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import axios from 'axios';
import { useSignaling } from '@/lib/webrtc/useSignaling';

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
    receiverId: string;
    text: string;
    timestamp: string;
    status?: 'pending' | 'sent' | 'read';
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
                setConversations(res.data);
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
        const audio = new Audio('/notification.mp3');
        audio.play().catch(err => console.error('Error playing sound:', err));
    };

    // Handle Real-time Messages over the same signaling socket (chat + WebRTC)
    useEffect(() => {
        if (!socket || !user) return;

        const handleNewMessage = async (data: {
            senderId: string;
            text: string;
            senderName: string;
            timestamp?: string;
        }) => {
            console.log(`Received chat-message from ${data.senderName}:`, data);
            const msgTimestamp = data.timestamp || new Date().toISOString();

            // If message is from the active conversation user -> push into opened thread
            if (activeConversation && data.senderId === activeConversation._id) {
                setMessages((prev) => [
                    ...prev,
                    {
                        _id: Date.now().toString(),
                        senderId: data.senderId,
                        receiverId: user._id,
                        text: data.text,
                        timestamp: msgTimestamp
                    }
                ]);
                scrollToBottom();
            } else {
                playNotificationSound();
            }

            // Update conversation list (last message & unread)
            let conversationExists = false;

            setConversations((prev) => {
                const existing = prev.find((c) => c._id === data.senderId);

                const isChatOpen =
                    !!activeConversation &&
                    activeConversation._id === data.senderId;

                if (existing) {
                    conversationExists = true;

                    if (isChatOpen) {
                        // Mark as read in backend via same signaling channel
                        markAsRead(data.senderId);
                    }

                    const updated: Conversation = {
                        ...existing,
                        lastMessage: {
                            text: data.text,
                            timestamp: msgTimestamp,
                            senderId: data.senderId
                        },
                        unreadCount: isChatOpen
                            ? 0
                            : (existing.unreadCount || 0) + 1
                    };

                    // Move updated conversation to top
                    return [
                        updated,
                        ...prev.filter((c) => c._id !== data.senderId)
                    ];
                }

                return prev;
            });

            // If conversation doesn't exist yet, fetch other user and create it
            if (!conversationExists && token) {
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
                            text: data.text,
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
        };

        socket.on('chat-message', handleNewMessage);

        const handleMessageSent = (data: { conversationId: string, text: string, timestamp: string, receiverId: string }) => {
            if (activeConversation && activeConversation._id === data.receiverId) {
                setMessages(prev => prev.map(msg =>
                    msg.text === data.text && msg.status === 'pending'
                        ? { ...msg, status: 'sent', timestamp: data.timestamp }
                        : msg
                ));
            }
        };

        const handleMessagesRead = (data: { readerId: string, conversationId: string }) => {
            if (activeConversation && activeConversation._id === data.readerId) {
                setMessages(prev => prev.map(msg =>
                    msg.senderId === user._id ? { ...msg, status: 'read' } : msg
                ));
            }
        };

        socket.on('message-sent', handleMessageSent);
        socket.on('messages-read', handleMessagesRead);

        return () => {
            socket.off('chat-message', handleNewMessage);
            socket.off('message-sent', handleMessageSent);
            socket.off('messages-read', handleMessagesRead);
        };
    }, [socket, activeConversation, user, token, markAsRead]);

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
            status: 'pending'
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
                    }
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
        <div className="p-4 lg:p-8 h-screen text-text-primary flex flex-col transition-colors duration-300 overflow-hidden">
            <div className="mb-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Messages</h1>
                <button
                    onClick={handleStartNewChat}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    New Chat
                </button>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden bg-surface border border-glass-border rounded-2xl shadow-xl relative">
                {/* New Chat Modal */}
                {showNewChatModal && (
                    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-surface border border-glass-border rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
                            <div className="p-4 border-b border-glass-border flex justify-between items-center">
                                <h3 className="font-bold text-lg">Start New Chat</h3>
                                <button
                                    onClick={() => setShowNewChatModal(false)}
                                    className="p-1 hover:bg-glass-bg rounded-full"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {friends.length === 0 ? (
                                    <div className="text-center p-8 text-text-secondary">
                                        No friends found. Add friends first!
                                    </div>
                                ) : (
                                    friends.map((friend) => (
                                        <button
                                            key={friend._id}
                                            onClick={() => selectFriendForChat(friend)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-glass-bg rounded-xl transition-colors text-left"
                                        >
                                            <img
                                                src={
                                                    friend.avatarUrl ||
                                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend._id}`
                                                }
                                                alt={friend.displayName}
                                                className="w-10 h-10 rounded-full bg-gray-700 object-cover"
                                            />
                                            <div>
                                                <p className="font-medium">
                                                    {friend.displayName}
                                                </p>
                                                <p className="text-xs text-text-secondary">
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

                {/* Chat List */}
                <div
                    className={`${activeConversation ? 'hidden md:flex' : 'flex'
                        } w-full md:w-80 lg:w-96 flex-col border-r border-glass-border bg-surface/50`}
                >
                    <div className="p-4 border-b border-glass-border">
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                                size={18}
                            />
                            <input
                                type="text"
                                placeholder="Search chats..."
                                className="w-full bg-glass-bg border border-glass-border rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary focus:outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {isLoading ? (
                            <div className="text-center p-4 text-text-secondary">
                                Loading...
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="text-center p-4 text-text-secondary">
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
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${activeConversation?._id === conv._id
                                            ? 'bg-primary/10 border border-primary/20'
                                            : 'hover:bg-glass-bg border border-transparent'
                                            }`}
                                    >
                                        <img
                                            src={
                                                conv.user.avatarUrl ||
                                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv._id}`
                                            }
                                            alt={conv.user.displayName}
                                            className="w-10 h-10 rounded-full bg-gray-700 object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-medium truncate text-sm">
                                                    {conv.user.displayName}
                                                </h4>
                                                {lastMessageTime && (
                                                    <span className="text-xs text-text-secondary">
                                                        {lastMessageTime}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p
                                                    className={`text-xs truncate ${conv.unreadCount > 0
                                                        ? 'font-bold text-text-primary'
                                                        : 'text-text-secondary'
                                                        }`}
                                                >
                                                    {fromMe ? 'You: ' : ''}
                                                    {lastText}
                                                </p>
                                                {conv.unreadCount > 0 && (
                                                    <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ml-2">
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
                        <div className="p-4 border-b border-glass-border flex items-center gap-3 bg-surface/80 backdrop-blur-md">
                            <button
                                onClick={() => setActiveConversation(null)}
                                className="md:hidden p-2 hover:bg-glass-bg rounded-full"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <img
                                src={
                                    activeConversation.user.avatarUrl ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConversation._id}`
                                }
                                alt={activeConversation.user.displayName}
                                className="w-10 h-10 rounded-full bg-gray-700 object-cover"
                            />
                            <div>
                                <h3 className="font-bold">
                                    {activeConversation.user.displayName}
                                </h3>
                                <p
                                    className={`text-xs flex items-center gap-1 ${onlineUsers.has(activeConversation._id)
                                        ? 'text-green-500'
                                        : 'text-gray-400'
                                        }`}
                                >
                                    <span
                                        className={`w-2 h-2 rounded-full ${onlineUsers.has(
                                            activeConversation._id
                                        )
                                            ? 'bg-green-500'
                                            : 'bg-gray-400'
                                            }`}
                                    ></span>
                                    {onlineUsers.has(activeConversation._id)
                                        ? 'Online'
                                        : 'Offline'}
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-glass-bg/30">
                            {messages.map((msg) => {
                                const isMe = msg.senderId === user?._id;
                                return (
                                    <div
                                        key={msg._id}
                                        className={`flex ${isMe
                                            ? 'justify-end'
                                            : 'justify-start'
                                            }`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe
                                                ? 'bg-primary text-white rounded-tr-none'
                                                : 'bg-surface border border-glass-border rounded-tl-none'
                                                }`}
                                        >
                                            <p className="text-sm">
                                                {msg.text}
                                            </p>
                                            <p
                                                className={`text-[10px] mt-1 ${isMe
                                                    ? 'text-white/70'
                                                    : 'text-text-secondary'
                                                    }`}
                                            >
                                                {new Date(
                                                    msg.timestamp
                                                ).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            {isMe && (
                                                <div className="flex justify-end mt-1">
                                                    {msg.status === 'pending' && <Clock size={12} className="text-white/70" />}
                                                    {msg.status === 'sent' && <Check size={12} className="text-white/70" />}
                                                    {msg.status === 'read' && <CheckCheck size={12} className="text-blue-200" />}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input or Friend Request */}
                        {canSend ? (
                            <form
                                onSubmit={handleSendMessage}
                                className="p-4 border-t border-glass-border bg-surface"
                            >
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) =>
                                            setInputText(e.target.value)
                                        }
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
                        ) : (
                            <div className="p-4 border-t border-glass-border bg-surface flex flex-col items-center justify-center gap-2">
                                <p className="text-sm text-text-secondary">
                                    You can only chat with friends.
                                </p>
                                {friendRequestStatus === 'pending' ? (
                                    <button
                                        disabled
                                        className="px-4 py-2 bg-gray-500 text-white rounded-xl text-sm font-medium cursor-not-allowed"
                                    >
                                        Request Sent
                                    </button>
                                ) : friendRequestStatus === 'received' ? (
                                    <button
                                        onClick={acceptFriendRequest}
                                        className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
                                    >
                                        Accept Friend Request
                                    </button>
                                ) : (
                                    <button
                                        onClick={sendFriendRequest}
                                        className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                                    >
                                        Send Friend Request
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="hidden md:flex flex-1 items-center justify-center flex-col text-text-secondary">
                        <div className="w-24 h-24 bg-glass-bg rounded-full flex items-center justify-center mb-6">
                            <MessageSquare size={48} className="text-primary/50" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">
                            Your Messages
                        </h3>
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}

