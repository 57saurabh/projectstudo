'use client';

import { useRef, useEffect } from 'react';
import LocalVideo from '@/components/video/LocalVideo';
import VideoGrid from '@/components/call/random/VideoGrid';
import Controls from '@/components/call/random/Controls';
import ChatArea from '@/components/call/random/ChatArea';
import { useCallStore } from '@/lib/store/useCallStore';
import { useSignaling } from '@/lib/webrtc/SignalingContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';

interface ActiveCallViewProps {
    // Props that might differ between contexts or need callbacks?
    // Actually, most state is in useCallStore, so we can rely on that.
    // Except maybe specific 'Next' or 'End' logic.
    onLeave: () => void;
    onNext?: () => void; // Optional, only for random
    showRequeue?: boolean; // Show "Next" button? 
}

export default function ActiveCallView({ onLeave, onNext, showRequeue = false }: ActiveCallViewProps) {
    const { user } = useSelector((state: RootState) => state.auth);
    const {
        participants,
        callState,
        remoteScreenShares,
        localScreenStream,
        chatId,
        messages,
        isFriend,
        remoteIsTyping
    } = useCallStore();

    const {
        sendMessage,
        sendTyping
    } = useSignaling();

    // Local UI State (could be passed down or kept here if transient)
    // Controls need 'toggleMic' etc. which interact with 'localStream'. 
    // 'localStream' is global in store now? Yes, we moved it in Task 1 references (but did we completely?).
    // Task 1 summary said: "Removing local localStream from useWebRTC and relying on useCallStore".
    // Let's check 'RandomChatPage' usage. It calls 'useWebRTC_Hook.toggleMic' basically.
    // We might need to access the WebRTC hook methods here? 
    // OR, we pass them as props? passing them as props is cleaner if the Parent manages the WebRTC hook life-cycle.
    // But 'ActiveCallView' implies IT handles the view.

    // DECISION: The 'useWebRTC' hook is tied to the page lifecycle usually? 
    // If we want to reuse this, the PARENT (RandomPage or RoomPage) should probably instantiate 'useWebRTC'
    // and pass the control methods down. 
    // Why? Because 'useWebRTC' creates the PeerConnections and handling streams.

    // So, we need to accept props for controls and streams.

    return null; // Placeholder until I read the code above to confirm props
}
