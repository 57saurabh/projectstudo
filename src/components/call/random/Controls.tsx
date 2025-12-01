import Link from 'next/link';
import { Mic, MicOff, PhoneOff, SkipForward, UserPlus, Send, Monitor, MessageSquare } from 'lucide-react';

interface ControlsProps {
    isMuted: boolean;
    toggleMic: () => void;
    toggleScreenShare: () => void;
    showChat: boolean;
    setShowChat: (show: boolean) => void;
    onSkip: () => void;
    onAddFriend: () => void;
    canAddFriend: boolean;
    onInvite: () => void;
    onAddRandomUser: () => void;
}

export default function Controls({
    isMuted,
    toggleMic,
    toggleScreenShare,
    showChat,
    setShowChat,
    onSkip,
    onAddFriend,
    canAddFriend,
    onInvite,
    onAddRandomUser
}: ControlsProps) {
    return (
        <div className="relative mb-6 flex justify-center z-10">
            <div className="flex items-center gap-3 rounded-xl bg-black/40 backdrop-blur-xl p-2 border border-white/10 shadow-2xl">
                <button
                    onClick={toggleMic}
                    className={`p-3 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>



                {/* Screen Share */}
                <button
                    onClick={toggleScreenShare}
                    className="p-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    title="Share Screen"
                >
                    <Monitor size={24} />
                </button>
                <Link href="/dashboard">
                    <button className="p-3 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors mx-2">
                        <PhoneOff size={24} />
                    </button>
                </Link>
                <button
                    onClick={onInvite}
                    className="p-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    title="Invite by Username/ID"
                >
                    <Send size={24} />
                </button>
                <button
                    onClick={onAddRandomUser}
                    className="p-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    title="Add Random User"
                >
                    <UserPlus size={24} />
                </button>
                <button
                    onClick={onSkip}
                    className="p-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    title="Skip"
                >
                    <SkipForward size={24} />
                </button>

                <div className="w-px h-6 bg-white/20 mx-1"></div>

                {/* Add Friend Button (Visible after 3 mins) */}
                {canAddFriend && (
                    <button
                        onClick={onAddFriend}
                        className="p-3 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors animate-pulse"
                        title="Add Friend"
                    >
                        <UserPlus size={24} />
                    </button>
                )}



                {/* Chat Toggle */}
                <button
                    onClick={() => setShowChat(!showChat)}
                    className={`p-3 rounded-lg transition-colors ${showChat ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'}`}
                    title="Toggle Chat"
                >
                    <MessageSquare size={24} className={showChat ? "" : "opacity-50"} />
                </button>
            </div>
        </div>
    );
}
