import { useRef, useEffect, useState } from 'react';
import { Send, Smile } from 'lucide-react';
import { ChatMessage } from '@/lib/store/useCallStore';
import Input from '@/components/ui/Input';
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

    // Logic for Disabling Input
    // 1. If currently in call (currentPeerId exists/active) -> Enabled (Requirement 8)
    // 2. If call ended (!currentPeerId):
    //    - If isFriend -> Enabled
    //    - If !isFriend -> Disabled

    // Note: page.tsx determines "currentPeerId" based on active participant.
    // If call ends, currentPeerId might become undefined.

    const isCallActive = !!currentPeerId;
    const canSend = isCallActive || isFriend;

    // If call ended and not friend, show warning inside input placeholder or separate message

    return (
        <div className="w-full lg:w-[360px] flex-shrink-0 flex flex-col bg-surface rounded-3xl overflow-hidden border border-border h-[35vh] min-h-[250px] lg:h-auto transition-all duration-300 shadow-xl relative">
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex items-end gap-2 ${msg.senderId === user?.id ? 'justify-end' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        {msg.senderId !== user?.id && !msg.isSystem && (
                            <div className="w-8 h-8 rounded-full bg-surface-hover border border-border flex-shrink-0" />
                        )}
                        <div className={`flex flex-col gap-1 ${msg.senderId === user?.id ? 'items-end' : 'items-start'} ${msg.isSystem ? 'w-full items-center' : ''}`}>
                            {!msg.isSystem && msg.senderId !== user?.id && (
                                <p className="text-text-muted text-[11px] font-bold ml-1">{msg.senderName}</p>
                            )}
                            <div className={`max-w-[240px] rounded-2xl px-4 py-2.5 text-sm font-medium shadow-sm break-words ${msg.isSystem
                                ? 'bg-surface-hover text-text-muted text-xs text-center italic w-full'
                                : (msg.senderId === user?.id
                                    ? 'bg-gold text-primary rounded-tr-none shadow-gold-glow'
                                    : 'bg-surface-hover text-text-primary border border-border rounded-tl-none')
                                } `}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
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

            <div className="p-3 border-t border-border bg-surface relative">
                {/* Warning if Locked */}
                {!canSend && (
                    <div className="mb-2 text-center text-xs text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20 font-medium">
                        Add friend to continue chatting
                    </div>
                )}

                <div className="relative" ref={emojiRef}>
                    {showEmojiPicker && (
                        <div className="absolute bottom-14 left-0 z-50 shadow-2xl rounded-2xl border border-border overflow-hidden">
                            <EmojiPicker
                                onEmojiClick={onEmojiClick}
                                theme={Theme.AUTO}
                                height={350}
                                width={300}
                                searchDisabled={false}
                            />
                        </div>
                    )}
                </div>

                <form onSubmit={onSendMessage} className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        disabled={!canSend}
                        className={`p-2.5 rounded-full transition-all ${showEmojiPicker ? 'bg-gold text-primary' : 'text-text-muted hover:bg-surface-hover hover:text-gold'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <Smile size={20} />
                    </button>

                    <div className="flex-1">
                        <Input
                            value={inputMessage}
                            onChange={(e) => handleTyping(e.target.value)}
                            disabled={!canSend}
                            placeholder={canSend ? "Message..." : "Locked"}
                            className="bg-surface-hover border-transparent focus:bg-background h-10"
                            rightElement={
                                <button
                                    type="submit"
                                    disabled={!canSend || !inputMessage.trim()}
                                    className="text-text-muted hover:text-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1"
                                >
                                    <Send size={18} />
                                </button>
                            }
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}
