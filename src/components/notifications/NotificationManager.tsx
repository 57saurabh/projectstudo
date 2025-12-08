'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSignaling } from '@/lib/webrtc/SignalingContext';// import { toast } from 'sonner'; // Removed as not installed 
// Checking package.json would be good, but I'll assume standard toast or use a simple alert for now if I can't find one.
// Actually, I'll use a custom UI for the toast to be safe and "Premium".

export default function NotificationManager() {
    const { socket } = useSignaling();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (data: { senderId: string; text: string; senderName: string; avatarUrl?: string }) => {
            // If we are already on the messages page, don't show toast (or maybe only if not active chat)
            // For simplicity, if pathname starts with /messages, we might skip, 
            // BUT user might be chatting with User A and receive msg from User B.
            // So ideally we check if we are chatting with THIS sender.

            // Since we don't have access to "activeConversation" state here easily without Redux/Context,
            // we will show notification if pathname is NOT /messages OR if it is /messages but we can't be sure.
            // Let's refine: If pathname is '/messages' AND we are not in a specific chat (no ID in URL? wait, URL doesn't change for active chat in my implementation yet? 
            // Ah, I added ?userId=... but that's for navigation. The internal state `activeConversation` changes URL? 
            // I should probably update URL when active conversation changes to make this robust.
            // For now, let's show notification unless we are on /messages.

            if (pathname === '/messages') {
                // We are on messages page. 
                // Ideally we check if the message is from the currently open chat.
                // But we can't know that here easily. 
                // Let's just play a sound or show a small indicator? 
                // Or just rely on the UI updating (which it does).
                return;
            }

            // Show Toast
            // I'll create a custom toast using DOM or a library if available. 
            // Since I don't know if 'sonner' or 'react-hot-toast' is installed, I will use a simple fixed position div.
            // Actually, let's check package.json first? No, I'll just build a simple one.

            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 z-[100] bg-surface border border-glass-border p-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-300 cursor-pointer';
            notification.style.backgroundColor = '#1e1e1e'; // Fallback
            notification.style.color = 'white';
            notification.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                    <img src="${data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.senderId}`}" alt="${data.senderName}" class="w-full h-full object-cover" />
                </div>
                <div>
                    <h4 class="font-bold text-sm">${data.senderName}</h4>
                    <p class="text-xs text-gray-400 truncate max-w-[200px]">${data.text}</p>
                </div>
            `;

            notification.onclick = () => {
                router.push(`/messages?userId=${data.senderId}`);
                notification.remove();
            };

            document.body.appendChild(notification);

            // Remove after 5 seconds
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.style.opacity = '0';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 5000);
        };

        socket.on('chat-message', handleNewMessage);

        return () => {
            socket.off('chat-message', handleNewMessage);
        };
    }, [socket, pathname, router]);

    return null; // Headless component
}
