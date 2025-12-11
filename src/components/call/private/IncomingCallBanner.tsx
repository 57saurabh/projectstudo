'use client';

import { useCallStore } from '@/lib/store/useCallStore';
import { useSignaling } from '@/lib/webrtc/SignalingContext';
import { Phone, PhoneOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function IncomingCallBanner() {
    const { incomingCall, setIncomingCall, setCallState } = useCallStore();
    const { socket } = useSignaling();
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (incomingCall) {
            setIsVisible(true);
            // Play ringtone here if desired
        } else {
            setIsVisible(false);
        }
    }, [incomingCall]);

    if (!incomingCall || !isVisible) return null;

    const { roomId, caller } = incomingCall;

    const handleAccept = () => {
        if (!socket) return;

        // Emit Accept
        socket.emit('private-call-action', { roomId, action: 'accept' });

        // Update State
        setIncomingCall(null);
        setCallState('connected');

        // Navigate to Room
        // NOTE: Backend emits 'room-created', which usually handles React state or redirection?
        // RandomChatPage waits for 'room-created'.
        // PrivateCallPage or RoomPage needs to handle it.
        // If we act globally, we should push to the Room Page.
        router.push(`/call/room/${roomId}?type=private`);
    };

    const handleDecline = () => {
        if (!socket) return;
        socket.emit('private-call-action', { roomId, action: 'decline' });
        setIncomingCall(null);
    };

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in slide-in-from-top-5 duration-300">
            <div className="bg-surface/95 backdrop-blur-xl border border-gold/50 shadow-2xl rounded-2xl p-4 flex items-center gap-4">

                {/* Caller Avatar */}
                <div className="relative">
                    <img
                        src={caller.avatarUrl || `https://ui-avatars.com/api/?name=${caller.username}`}
                        alt={caller.username}
                        className="w-16 h-16 rounded-full border-2 border-gold object-cover bg-background"
                    />
                    <div className="absolute inset-0 rounded-full border-2 border-gold animate-ping opacity-75"></div>
                </div>

                {/* Info */}
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-text-primary">{caller.displayName || caller.username}</h3>
                    <p className="text-gold text-sm animate-pulse">Incoming Video Call...</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={handleDecline}
                        className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-transform hover:scale-105"
                        title="Decline"
                    >
                        <PhoneOff size={24} />
                    </button>
                    <button
                        onClick={handleAccept}
                        className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-transform hover:scale-105"
                        title="Accept"
                    >
                        <Phone size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
}
