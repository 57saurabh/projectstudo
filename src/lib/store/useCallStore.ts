import { create } from 'zustand';

export interface Participant {
    id: string;
    displayName: string;
    isMuted: boolean;
    isVideoOff: boolean;
    reputation?: number;
    avatarUrl?: string;
}

export interface ChatMessage {
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    isSystem?: boolean;
}

interface CallState {
    // Media Streams
    localStream: MediaStream | null;
    remoteStreams: Record<string, MediaStream>; // userId -> Stream

    // Call Status
    roomId: string | null;
    callType: 'random' | 'private' | 'group' | null;
    inQueue: boolean;
    inCall: boolean;

    // User Status
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;

    // Data
    participants: Participant[];
    messages: ChatMessage[];
    mediaError: string | null;

    // Actions
    setLocalStream: (stream: MediaStream | null) => void;
    setMediaError: (error: string | null) => void;
    addRemoteStream: (userId: string, stream: MediaStream) => void;
    removeRemoteStream: (userId: string) => void;

    setRoomId: (roomId: string | null) => void;
    setCallType: (type: 'random' | 'private' | 'group' | null) => void;
    setInQueue: (inQueue: boolean) => void;
    setInCall: (inCall: boolean) => void;

    toggleMute: () => void;
    toggleVideo: () => void;
    setIsScreenSharing: (isScreenSharing: boolean) => void;

    addParticipant: (participant: Participant) => void;
    removeParticipant: (userId: string) => void;
    updateParticipant: (userId: string, updates: Partial<Participant>) => void;

    addMessage: (message: ChatMessage) => void;
    resetCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
    localStream: null,
    remoteStreams: {},

    roomId: null,
    callType: null,
    inQueue: false,
    inCall: false,

    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,

    participants: [],
    messages: [],

    mediaError: null,

    setLocalStream: (stream) => set({ localStream: stream }),
    setMediaError: (error: string | null) => set({ mediaError: error }),
    addRemoteStream: (userId, stream) => set((state) => ({
        remoteStreams: { ...state.remoteStreams, [userId]: stream }
    })),
    removeRemoteStream: (userId) => set((state) => {
        const newStreams = { ...state.remoteStreams };
        delete newStreams[userId];
        return { remoteStreams: newStreams };
    }),

    setRoomId: (roomId) => set({ roomId }),
    setCallType: (callType) => set({ callType }),
    setInQueue: (inQueue) => set({ inQueue }),
    setInCall: (inCall) => set({ inCall }),

    toggleMute: () => set((state) => {
        if (state.localStream) {
            state.localStream.getAudioTracks().forEach(track => track.enabled = !state.isMuted);
        }
        return { isMuted: !state.isMuted };
    }),
    toggleVideo: () => set((state) => {
        if (state.localStream) {
            // If currently OFF (true), we want to turn ON (enabled=true).
            // If currently ON (false), we want to turn OFF (enabled=false).
            // So enabled should match the CURRENT isVideoOff value (before toggle).
            state.localStream.getVideoTracks().forEach(track => track.enabled = state.isVideoOff);
        }
        return { isVideoOff: !state.isVideoOff };
    }),
    setIsScreenSharing: (isScreenSharing) => set({ isScreenSharing }),

    addParticipant: (participant) => set((state) => ({
        participants: [...state.participants.filter(p => p.id !== participant.id), participant]
    })),
    removeParticipant: (userId) => set((state) => ({
        participants: state.participants.filter(p => p.id !== userId)
    })),
    updateParticipant: (userId, updates) => set((state) => ({
        participants: state.participants.map(p => p.id === userId ? { ...p, ...updates } : p)
    })),

    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
    })),

    resetCall: () => set({
        localStream: null,
        mediaError: null,
        remoteStreams: {},
        roomId: null,
        callType: null,
        inQueue: false,
        inCall: false,
        participants: [],
        messages: [],
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false
    })
}));
