// src/lib/store/useCallStore.ts
import { create } from 'zustand';

export type CallState = 'idle' | 'searching' | 'matching' | 'proposed' | 'connecting' | 'connected';

export interface ParticipantPublic {
  peerId: string;
  userId?: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  language?: string;
  reputation?: number;
  profession?: string;
  interests?: string[];
  preferences?: any;
}

export interface ChatMessage {
  chatId?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: Date | string | number; // flexible
  isSystem?: boolean;
}

export interface PendingInvite {
  roomId: string;
  senderId: string;
  senderName: string;
  avatarUrl?: string;
}

interface Proposal {
  roomId: string;
  type: 'incoming' | 'outgoing';
  candidate: ParticipantPublic; // The other person to show in UI
  participants: ParticipantPublic[];
  createdAt: number;
  keyId?: string; // Explicit ID for voting (The Proposal Owner)
}

interface CallStore {
  callState: CallState;
  setCallState: (s: CallState) => void;

  currentRoomId: string | null;
  setCurrentRoomId: (id: string | null) => void;

  localStream: MediaStream | null;
  setLocalStream: (s: MediaStream | null) => void;

  localScreenStream: MediaStream | null;
  setLocalScreenStream: (s: MediaStream | null) => void;

  // Map of peerId -> Screen Share Stream
  remoteScreenShares: Record<string, MediaStream>;
  setRemoteScreenShare: (peerId: string, stream: MediaStream | null) => void;

  participants: ParticipantPublic[];
  setParticipants: (p: ParticipantPublic[]) => void;
  addParticipant: (p: ParticipantPublic) => void;
  removeParticipant: (peerId: string) => void;

  proposal: Proposal | null;
  setProposal: (p: Proposal | null) => void;
  clearProposal: () => void;

  searchingToken?: string | null; // generated token for the current search session (prevents cross-requests)
  setSearchingToken: (t?: string | null) => void;

  acceptSentMap: Record<string, boolean>; // key: `${roomId}:${candidateId}`
  markAcceptSent: (key: string) => void;
  clearAcceptSent: (key?: string) => void;

  // Chat & Friendship
  chatId: string | null;
  setChatId: (id: string | null) => void;

  messages: ChatMessage[];
  setMessages: (m: ChatMessage[]) => void;
  addMessage: (m: ChatMessage) => void;

  isFriend: boolean;
  setIsFriend: (b: boolean) => void;

  remoteIsTyping: boolean;
  setRemoteIsTyping: (isTyping: boolean) => void;
}

export const useCallStore = create<CallStore>()((set, get) => ({
  callState: 'idle',
  setCallState: (s) => set({ callState: s }),

  currentRoomId: null,
  setCurrentRoomId: (id) => set({ currentRoomId: id }),

  localStream: null,
  setLocalStream: (s) => set({ localStream: s }),

  localScreenStream: null,
  setLocalScreenStream: (s) => set({ localScreenStream: s }),

  remoteScreenShares: {},
  setRemoteScreenShare: (peerId, stream) =>
    set((state) => {
      const next = { ...state.remoteScreenShares };
      if (stream) next[peerId] = stream;
      else delete next[peerId];
      return { remoteScreenShares: next };
    }),

  participants: [],
  setParticipants: (p) => set({ participants: p }),
  addParticipant: (p) =>
    set((st) => ({ participants: [...st.participants.filter((x) => x.peerId !== p.peerId), p] })),
  removeParticipant: (peerId) =>
    set((st) => ({ participants: st.participants.filter((x) => x.peerId !== peerId) })),

  proposal: null,
  setProposal: (p) => set({ proposal: p }),
  clearProposal: () => set({ proposal: null }),

  searchingToken: null,
  setSearchingToken: (t) => set({ searchingToken: t }),

  acceptSentMap: {},
  markAcceptSent: (key) => set((s) => ({ acceptSentMap: { ...s.acceptSentMap, [key]: true } })),
  clearAcceptSent: (key) =>
    set((s) => {
      if (!key) return { acceptSentMap: {} };
      const next = { ...s.acceptSentMap };
      delete next[key];
      return { acceptSentMap: next };
    }),

  chatId: null,
  setChatId: (id) => set({ chatId: id }),

  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  isFriend: false,
  setIsFriend: (is) => set({ isFriend: is }),

  remoteIsTyping: false,
  setRemoteIsTyping: (isTyping) => set({ remoteIsTyping: isTyping }),
}));
