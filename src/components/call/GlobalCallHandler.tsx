'use client';

import { useEffect } from 'react';
import { useSignaling } from '@/lib/webrtc/SignalingContext';
import { useCallStore } from '@/lib/store/useCallStore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function GlobalCallHandler() {
    const { socket } = useSignaling();
    const { setIncomingCall, setCallState, incomingCall, callState } = useCallStore();
    const router = useRouter();

    useEffect(() => {
        if (!socket) return;

        const handleIncomingPrivateCall = (data: { roomId: string, caller: any }) => {
            console.log('[GlobalCallHandler] Incoming Private Call:', data);

            // If already in a call, maybe auto-decline or show "Waiting"?
            // For now, we assume we can receive it and show the banner.
            // If we are strictly "busy", backend should have handled it? 
            // Backend checks 'roomService.getRoomId', so if we are in a room, it should fail.
            // But if we are in 'idle' or 'searching' on frontend but not technically in a room DB-wise?

            setIncomingCall({
                roomId: data.roomId,
                caller: data.caller,
                type: 'private'
            });
            // We don't change 'callState' yet, just show the banner. 
            // Or we could set 'incoming' state if we want full screen?
            // User requested "Banner appears... visible anywhere". So state might be independent or 'incoming'
            // usage depends on if we want to block interaction.
        };

        const handlePrivateCallEnded = (data: { reason: string }) => {
            console.log('[GlobalCallHandler] Private Call Ended:', data);

            if (incomingCall) {
                // If we were just ringing
                setIncomingCall(null);
                if (data.reason === 'missed') {
                    // toast.info('Missed call'); 
                    // UI requirement: "Receiver immediately loses the banner (missed call)"
                }
            }

            // If we were waiting (Caller side) - checked via 'calling' state?
            // This event is also sent to Caller if Receiver declines.
            if (callState === 'calling') {
                setCallState('idle');
                if (data.reason === 'declined') {
                    toast.info('Call declined');
                } else if (data.reason === 'busy') {
                    toast.warning('User is busy');
                }
            }
        };

        const handlePrivateCallOutgoing = (data: { roomId: string, target: any }) => {
            // Confirming outgoing call started
            // We can use this to set specific state if needed, but synchronous emit usually enough.
            // But good to have confirmation.
            console.log('[GlobalCallHandler] Outgoing Call Confirmed:', data);
        };

        const handlePrivateCallError = (data: { code: string, message: string }) => {
            if (callState === 'calling') {
                setCallState('idle');
                toast.error(data.message);
            }
        };

        socket.on('incoming-private-call', handleIncomingPrivateCall);
        socket.on('private-call-ended', handlePrivateCallEnded);
        socket.on('private-call-outgoing', handlePrivateCallOutgoing);
        socket.on('private-call-error', handlePrivateCallError);

        return () => {
            socket.off('incoming-private-call', handleIncomingPrivateCall);
            socket.off('private-call-ended', handlePrivateCallEnded);
            socket.off('private-call-outgoing', handlePrivateCallOutgoing);
            socket.off('private-call-error', handlePrivateCallError);
        };
    }, [socket, incomingCall, callState, setIncomingCall, setCallState]);

    return null; // Logic only
}
