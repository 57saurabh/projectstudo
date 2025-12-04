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
        <div className="relative mb-6 flex justify-center z-10 w-full px-4">
            <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3 rounded-xl bg-black/40 backdrop-blur-xl p-1.5 md:p-2 border border-white/10 shadow-2xl max-w-full">
                <button
                    onClick={toggleMic}
                    className={`p-2 md:p-3 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <MicOff size={20} className="md:w-6 md:h-6" /> : <Mic size={20} className="md:w-6 md:h-6" />}
                </button>



                {/* Screen Share */}
                <button
                    onClick={toggleScreenShare}
                    className="p-2 md:p-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    title="Share Screen"
                >
                    <Monitor size={20} className="md:w-6 md:h-6" />
                </button>
                <Link href="/dashboard">
                    <button className="p-2 md:p-3 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors mx-1 md:mx-2">
                        <PhoneOff size={20} className="md:w-6 md:h-6" />
                    </button>
                </Link>
                <button
                    onClick={onInvite}
                    className="p-2 md:p-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    title="Invite by Username/ID"
                >
                    <Send size={20} className="md:w-6 md:h-6" />
                </button>
                <button
                    onClick={onAddRandomUser}
                    className="group relative p-2 md:p-3 rounded-lg text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg hover:shadow-purple-500/25 mx-1"
                    title="Add (+1) Person to Call"
                >
                    <UserPlus size={20} className="md:w-6 md:h-6" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                    </span>
                </button>
                <button
                    onClick={onSkip}
                    className="p-2 md:p-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    title="Skip"
                >
                    <SkipForward size={20} className="md:w-6 md:h-6" />
                </button>

                <div className="w-px h-5 md:h-6 bg-white/20 mx-0.5 md:mx-1"></div>

                {/* Add Friend Button (Visible after 3 mins) */}
                {canAddFriend && (
                    <button
                        onClick={onAddFriend}
                        className="p-2 md:p-3 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors animate-pulse"
                        title="Add Friend"
                    >
                        <UserPlus size={20} className="md:w-6 md:h-6" />
                    </button>
                )}



                {/* Chat Toggle */}
                <button
                    onClick={() => setShowChat(!showChat)}
                    className={`p-2 md:p-3 rounded-lg transition-colors ${showChat ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'}`}
                    title="Toggle Chat"
                >
                    <MessageSquare size={20} className={`md:w-6 md:h-6 ${showChat ? "" : "opacity-50"}`} />
                </button>
            </div>
        </div>
    );
}
