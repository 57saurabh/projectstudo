import { useRef, useEffect, useState } from 'react';
import { Send, Smile } from 'lucide-react';
import { ChatMessage } from '@/lib/store/useCallStore';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface ChatAreaProps {
    showChat: boolean;
    messages: ChatMessage[];
    user: any;
    inputMessage: string;
    setInputMessage: (msg: string) => void;
    onSendMessage: (e?: React.FormEvent) => void;
    currentPeerId: string | undefined;
    chatId: string | null;
    isFriend: boolean;
    remoteIsTyping: boolean;
    sendTyping: (isTyping: boolean) => void;
}

export default function ChatArea({
    showChat,
    messages,
    user,
    inputMessage,
    setInputMessage,
    onSendMessage,
    currentPeerId,
    chatId,
    isFriend,
    remoteIsTyping,
    sendTyping
}: ChatAreaProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Typing Handler
    const handleTyping = (value: string) => {
        setInputMessage(value);

        if (value.trim()) {
            sendTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                sendTyping(false);
            }, 2000);
        } else {
            sendTyping(false);
        }
    };


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setInputMessage(inputMessage + emojiData.emoji);
        // keep picker open or close it? usually keep open for multiple emojis
    };

    if (!showChat) return null;

    const isCallActive = !!currentPeerId;
    const canSend = isCallActive || isFriend;

    return (
        <div className="w-full lg:w-[360px] flex-shrink-0 flex flex-col bg-surface rounded-3xl overflow-hidden border border-border h-[35vh] min-h-[250px] lg:h-auto transition-all duration-300 shadow-xl relative">
            {/* Messages List - Enhanced with Avatar/Name */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {messages.map((msg, index) => {
                    const isMe = msg.senderId === 'me' || msg.senderId === user?.id || (user as any)?._id === msg.senderId;
                    // Fallback avatar if missing
                    const avatarUrl = msg.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`;
                    const displayName = msg.senderName || 'Anonymous';

                    return (
                        <div key={index} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className="flex flex-col items-center gap-1">
                                <img
                                    src={avatarUrl}
                                    className="w-8 h-8 rounded-full bg-surface-hover object-cover border border-border"
                                    alt="avatar"
                                />
                            </div>

                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                {/* Username */}
                                <span className="text-[10px] text-text-muted mb-1 px-1">
                                    {displayName}
                                </span>

                                {/* Bubble */}
                                <div className={`px-4 py-2 rounded-2xl text-sm ${isMe
                                    ? 'bg-gold text-primary rounded-tr-none'
                                    : 'bg-surface-hover text-text-primary rounded-tl-none border border-border'
                                    }`}>
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-text-muted mt-1 px-1">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {/* Typing Indicator */}
                {remoteIsTyping && (
                    <div className="flex items-center gap-2 mb-2 ml-4">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-text-muted/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-text-muted/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-text-muted/50 rounded-full animate-bounce"></span>
                        </div>
                        <span className="text-xs text-text-muted italic">Typing...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-surface/50 backdrop-blur-md border-t border-border relative z-50">
                {/* Warning if Locked */}
                {!canSend && (
                    <div className="mb-2 text-center text-xs text-danger bg-danger/10 p-2 rounded-lg border border-danger/20 font-medium">
                        Add friend to continue chatting
                    </div>
                )}

                {/* Emoji Picker */}
                {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl rounded-xl overflow-hidden border border-border" ref={emojiRef}>
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            theme={Theme.DARK}
                            width={300}
                            height={350}
                            searchDisabled={false}
                        />
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        disabled={!canSend}
                        className={`p-2.5 rounded-full transition-all ${showEmojiPicker ? 'bg-gold text-primary' : 'text-text-muted hover:bg-surface-hover hover:text-gold'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <Smile size={20} />
                    </button>
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSendMessage(e);
                        }}
                        placeholder={canSend ? "Type a message..." : "Chat locked"}
                        disabled={!canSend}
                        className="flex-1 bg-surface-hover border border-border rounded-xl px-4 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50 focus:bg-surface-hover transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                        type="button"
                        onClick={onSendMessage}
                        disabled={!canSend || !inputMessage.trim()}
                        className="p-3 bg-gold text-primary rounded-xl hover:bg-gold-hover shadow-lg shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center aspect-square"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
