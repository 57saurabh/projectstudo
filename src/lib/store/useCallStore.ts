import { create } from 'zustand';

export interface Participant {
    id: string; // Socket ID
    userId?: string; // DB User ID (ObjectId)
    displayName: string;
    isMuted: boolean;
    isVideoOff: boolean;
    reputation?: number;
    avatarUrl?: string;
    shouldOffer?: boolean;
    bio?: string;
    country?: string;
    language?: string;
}

export interface ChatMessage {
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    isSystem?: boolean;
}

export interface PendingInvite {
    senderId: string;
    senderName: string;
    avatarUrl?: string;
}

interface CallState {
    // Media Streams
    localStream: MediaStream | null;
    remoteStreams: Record<string, MediaStream>; // userId -> Stream

    // Call Status
    roomId: string | null;
    callType: 'random' | 'private' | 'group' | null;
    callState: 'idle' | 'searching' | 'proposed' | 'connecting' | 'connected';
    inQueue: boolean;
    inCall: boolean;
    isInitiator: boolean;

    pendingInvite: PendingInvite | null;

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
    setCallState: (state: 'idle' | 'searching' | 'proposed' | 'connecting' | 'connected') => void;
    setInQueue: (inQueue: boolean) => void;
    setInCall: (inCall: boolean) => void;
    setIsInitiator: (isInitiator: boolean) => void;

    setPendingInvite: (invite: PendingInvite | null) => void;

    toggleMute: () => void;
    toggleVideo: () => void;
    setIsScreenSharing: (isScreenSharing: boolean) => void;

    addParticipant: (participant: Participant) => void;
    removeParticipant: (userId: string) => void;
    updateParticipant: (userId: string, updates: Partial<Participant>) => void;

    addMessage: (message: ChatMessage) => void;
    resetCall: (keepLocalStream?: boolean) => void;
}

export const useCallStore = create<CallState>((set) => ({
    localStream: null,
    remoteStreams: {},

    roomId: null,
    callType: null,
    callState: 'idle',
    inQueue: false,
    inCall: false,
    isInitiator: false,

    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,

    participants: [],
    messages: [],

    mediaError: null,

    pendingInvite: null,

    setPendingInvite: (invite) => set({ pendingInvite: invite }),

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
    setCallState: (callState) => set({ callState }),
    setInQueue: (inQueue) => set({ inQueue }),
    setInCall: (inCall) => set({ inCall }),
    setIsInitiator: (isInitiator) => set({ isInitiator }),

    toggleMute: () => set((state) => {
        if (state.localStream) {
            const tracks = state.localStream.getAudioTracks();
            console.log('[useCallStore] Toggling mute. Current isMuted:', state.isMuted, 'Audio Tracks:', tracks.length);
            tracks.forEach(track => {
                track.enabled = state.isMuted; // If isMuted=true (currently muted), set enabled=true (unmute).
                console.log('[useCallStore] Track', track.id, 'enabled set to:', track.enabled);
            });
        } else {
            console.warn('[useCallStore] No local stream found when toggling mute');
        }
        return { isMuted: !state.isMuted };
    }),
    toggleVideo: () => set((state) => {
        if (state.localStream) {
            const tracks = state.localStream.getVideoTracks();
            console.log('[useCallStore] Toggling video. Current isVideoOff:', state.isVideoOff, 'Video Tracks:', tracks.length);
            tracks.forEach(track => {
                track.enabled = state.isVideoOff; // If isVideoOff=true (currently off), set enabled=true (on).
                console.log('[useCallStore] Track', track.id, 'enabled set to:', track.enabled);
            });
        } else {
            console.warn('[useCallStore] No local stream found when toggling video');
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

    resetCall: (keepLocalStream = false) => set((state) => ({
        localStream: keepLocalStream ? state.localStream : null,
        mediaError: null,
        remoteStreams: {},
        roomId: null,
        callType: null,
        callState: 'idle',
        inQueue: false,
        inCall: false,
        isInitiator: false,
        participants: [],
        messages: [],
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        pendingInvite: null
    }))
}));
