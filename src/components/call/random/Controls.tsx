import Link from 'next/link';
import { Mic, MicOff, PhoneOff, SkipForward, UserPlus, Send, Monitor, MessageSquare, Video, VideoOff } from 'lucide-react';

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
    const buttonBase = "p-3 md:p-4 rounded-full transition-all duration-200 flex items-center justify-center";
    const ghostButton = `${buttonBase} bg-surface-hover text-text-secondary hover:text-primary hover:bg-surface border border-border hover:border-gold/30`;
    const dangerButton = `${buttonBase} bg-danger text-white hover:bg-danger-hover shadow-danger-glow`;
    const goldButton = `${buttonBase} bg-gold text-primary hover:bg-gold-hover shadow-gold-glow`;
    const orangeButton = `${buttonBase} bg-orange text-primary hover:bg-orange-hover shadow-orange-glow`;

    return (
        <div className="relative mb-6 flex justify-center z-10 w-full px-4">
            <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4 p-2 rounded-full bg-surface/90 backdrop-blur-xl border border-border shadow-2xl">

                {/* Mic */}
                <button
                    onClick={toggleMic}
                    className={isMuted ? dangerButton : ghostButton}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* Screen Share */}
                <button
                    onClick={toggleScreenShare}
                    className={ghostButton}
                    title="Share Screen"
                >
                    <Monitor size={20} />
                </button>

                {/* Invite */}
                <button
                    onClick={onInvite}
                    className={ghostButton}
                    title="Invite by Username/ID"
                >
                    <Send size={20} />
                </button>

                {/* Add Random User */}
                <button
                    onClick={onAddRandomUser}
                    className={`${goldButton} relative group`}
                    title="Add (+1) Person to Call"
                >
                    <UserPlus size={20} />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                </button>

                {/* Skip */}
                <button
                    onClick={onSkip}
                    className={orangeButton}
                    title="Skip"
                >
                    <SkipForward size={20} />
                </button>

                <div className="w-px h-8 bg-border mx-1"></div>

                {/* End Call */}
                <Link href="/">
                    <button className={dangerButton}>
                        <PhoneOff size={20} />
                    </button>
                </Link>

                {/* Add Friend Button (Visible after 90s) */}
                {canAddFriend && (
                    <button
                        onClick={onAddFriend}
                        className={`${goldButton} animate-pulse`}
                        title="Add Friend"
                    >
                        <UserPlus size={20} />
                    </button>
                )}

                {/* Chat Toggle */}
                <button
                    onClick={() => setShowChat(!showChat)}
                    className={showChat ? goldButton : ghostButton}
                    title="Toggle Chat"
                >
                    <MessageSquare size={20} />
                </button>
            </div>
        </div>
    );
}
