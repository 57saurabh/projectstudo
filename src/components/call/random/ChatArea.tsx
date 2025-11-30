import { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage } from '@/lib/store/useCallStore';

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
        <div className="w-full lg:w-[360px] flex-shrink-0 flex flex-col bg-[#191121]/50 rounded-xl overflow-hidden border border-white/10 h-[300px] lg:h-auto transition-all duration-300">
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex items-end gap-3 ${msg.senderId === user?.id ? 'justify-end' : ''}`}>
                        {msg.senderId !== user?.id && !msg.isSystem && (
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0" />
                        )}
                        <div className={`flex flex-col gap-1 ${msg.senderId === user?.id ? 'items-end' : 'items-start'} ${msg.isSystem ? 'w-full items-center' : ''}`}>
                            {!msg.isSystem && <p className="text-white/60 text-[13px] font-medium">{msg.senderName}</p>}
                            <div className={`max-w-[240px] rounded-lg px-3 py-2 text-white text-sm ${msg.isSystem ? 'bg-white/5 text-xs text-center italic' : (msg.senderId === user?.id ? 'bg-[#7f19e6]' : 'bg-white/10')}`}>
                                {msg.text}
                            </div>
                        </div>
                        {msg.senderId === user?.id && !msg.isSystem && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7f19e6] to-blue-500 flex-shrink-0" />
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/10 bg-[#191121]">
                <form onSubmit={onSendMessage} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 border border-white/10 focus-within:border-[#7f19e6]/50 transition-colors">
                    <input
                        className="flex-1 bg-transparent text-white placeholder:text-white/50 text-sm border-0 focus:ring-0 p-0 h-10"
                        placeholder={currentPeerId ? "Send a message..." : "Waiting for match..."}
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        disabled={!currentPeerId}
                    />
                    <button
                        type="submit"
                        disabled={!currentPeerId || !inputMessage.trim()}
                        className="p-2 text-white/70 hover:text-[#7f19e6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}
