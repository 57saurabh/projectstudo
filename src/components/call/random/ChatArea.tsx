import { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage } from '@/lib/store/useCallStore';
import Input from '@/components/ui/Input';

interface ChatAreaProps {
    showChat: boolean;
    messages: ChatMessage[];
    user: any;
    inputMessage: string;
    setInputMessage: (msg: string) => void;
    onSendMessage: (e?: React.FormEvent) => void;
    currentPeerId: string | undefined;
}

export default function ChatArea({
    showChat,
    messages,
    user,
    inputMessage,
    setInputMessage,
    onSendMessage,
    currentPeerId
}: ChatAreaProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!showChat) return null;

    return (
        <div className="w-full lg:w-[360px] flex-shrink-0 flex flex-col bg-surface rounded-3xl overflow-hidden border border-border h-[300px] lg:h-auto transition-all duration-300">
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex items-end gap-3 ${msg.senderId === user?.id ? 'justify-end' : ''}`}>
                        {msg.senderId !== user?.id && !msg.isSystem && (
                            <div className="w-8 h-8 rounded-full bg-surface-hover border border-border flex-shrink-0" />
                        )}
                        <div className={`flex flex-col gap-1 ${msg.senderId === user?.id ? 'items-end' : 'items-start'} ${msg.isSystem ? 'w-full items-center' : ''}`}>
                            {!msg.isSystem && <p className="text-text-muted text-[13px] font-medium">{msg.senderName}</p>}
                            <div className={`max-w-[240px] rounded-2xl px-4 py-2 text-sm font-medium ${
                                msg.isSystem 
                                ? 'bg-surface-hover text-text-muted text-xs text-center italic' 
                                : (msg.senderId === user?.id 
                                    ? 'bg-gold text-white shadow-gold-glow' 
                                    : 'bg-accent-cream text-background')
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                        {msg.senderId === user?.id && !msg.isSystem && (
                            <div className="w-8 h-8 rounded-full bg-gold flex-shrink-0" />
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border bg-surface">
                <form onSubmit={onSendMessage}>
                    <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        disabled={!currentPeerId}
                        placeholder={currentPeerId ? "Send a message..." : "Waiting for match..."}
                        rightElement={
                            <button
                                type="submit"
                                disabled={!currentPeerId || !inputMessage.trim()}
                                className="text-text-muted hover:text-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={20} />
                            </button>
                        }
                    />
                </form>
            </div>
        </div>
    );
}
