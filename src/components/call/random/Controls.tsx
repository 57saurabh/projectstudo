import { useState } from 'react';
import Link from 'next/link';
import { Mic, MicOff, PhoneOff, SkipForward, UserPlus, Send, Monitor, MessageSquare, Video, VideoOff, MoreVertical, X } from 'lucide-react';

interface ControlsProps {
    isMuted: boolean;
    toggleMic: () => void;
    toggleScreenShare: () => void;
    isScreenSharing: boolean;
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
    isScreenSharing,
    showChat,
    setShowChat,
    onSkip,
    onAddFriend,
    canAddFriend,
    onInvite,
    onAddRandomUser
}: ControlsProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const buttonBase = "p-3 md:p-4 rounded-full transition-all duration-200 flex items-center justify-center";
    const ghostButton = `${buttonBase} bg-surface-hover text-text-secondary hover:text-primary hover:bg-surface border border-border hover:border-gold/30`;
    const dangerButton = `${buttonBase} bg-danger text-white hover:bg-danger-hover shadow-danger-glow`;
    const goldButton = `${buttonBase} bg-gold text-primary hover:bg-gold-hover shadow-gold-glow`;
    const orangeButton = `${buttonBase} bg-orange text-primary hover:bg-orange-hover shadow-orange-glow`;

    // Dropdown for mobile
    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <div className="relative mb-6 flex justify-center z-50 w-full px-4">
            {/* Main Bar */}
            <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4 p-2 rounded-full bg-surface/90 backdrop-blur-xl border border-border shadow-2xl relative z-50">

                {/* --- Primary Controls (Always Visible) --- */}

                {/* Mic */}
                <button
                    onClick={toggleMic}
                    className={isMuted ? dangerButton : ghostButton}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* End Call (Center) */}
                <Link href="/" onClick={(e) => {
                    // Since onSkip/Abort calls are passed, maybe we handle cleanup there?
                    // Currently Link handles navigation but parent unmount handles socket cleanup.
                }}>
                    <button className={dangerButton}>
                        <PhoneOff size={20} />
                    </button>
                </Link>

                {/* Next / Skip */}
                <button
                    onClick={onAddRandomUser} // Mapped to Next logic in page.tsx
                    className={goldButton}
                    title="Next Person"
                >
                    <SkipForward size={20} />
                    {/* Or UserPlus if "Add". But user said "Next". Let's use SkipForward for clarity or UserPlus as before?
                         Before it was UserPlus with ping.
                         Let's keep UserPlus but style it as Next actions.
                     */}
                </button>


                {/* --- Desktop Only Controls (Hidden on Mobile) --- */}
                <div className="hidden md:flex gap-3 items-center">
                    <div className="w-px h-8 bg-border mx-1"></div>

                    {/* Chat Toggle */}
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={showChat ? goldButton : ghostButton}
                        title="Toggle Chat"
                    >
                        <MessageSquare size={20} />
                    </button>

                    {/* Screen Share */}
                    <button
                        onClick={toggleScreenShare}
                        className={isScreenSharing ? dangerButton : ghostButton}
                        title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
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

                    {/* Add Friend */}
                    {canAddFriend && (
                        <button
                            onClick={onAddFriend}
                            className={`${goldButton} animate-pulse`}
                            title="Add Friend"
                        >
                            <UserPlus size={20} />
                        </button>
                    )}
                </div>

                {/* --- Mobile Menu Toggle --- */}
                <button
                    onClick={toggleMenu}
                    className={`md:hidden ${ghostButton} ${isMenuOpen ? 'bg-surface text-primary' : ''}`}
                >
                    {isMenuOpen ? <X size={20} /> : <MoreVertical size={20} />}
                </button>
            </div>

            {/* --- Mobile Menu Dropdown --- */}
            {isMenuOpen && (
                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-xl border border-border rounded-xl p-4 shadow-2xl flex flex-col gap-3 min-w-[200px] z-40 animate-in slide-in-from-bottom-5 fade-in duration-200">

                    <button
                        onClick={() => { setShowChat(!showChat); toggleMenu(); }}
                        className="flex items-center gap-3 p-3 hover:bg-surface-hover rounded-lg text-text-primary transition-colors"
                    >
                        <MessageSquare size={18} />
                        <span>{showChat ? 'Hide Chat' : 'Show Chat'}</span>
                    </button>

                    <button
                        onClick={() => { toggleScreenShare(); toggleMenu(); }}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isScreenSharing ? 'text-red-500 hover:bg-red-500/10' : 'text-text-primary hover:bg-surface-hover'}`}
                    >
                        <Monitor size={18} />
                        <span>{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
                    </button>

                    <button
                        onClick={() => { onInvite(); toggleMenu(); }}
                        className="flex items-center gap-3 p-3 hover:bg-surface-hover rounded-lg text-text-primary transition-colors"
                    >
                        <Send size={18} />
                        <span>Invite User</span>
                    </button>

                    {canAddFriend && (
                        <button
                            onClick={() => { onAddFriend(); toggleMenu(); }}
                            className="flex items-center gap-3 p-3 hover:bg-surface-hover rounded-lg text-gold transition-colors"
                        >
                            <UserPlus size={18} />
                            <span>Add Friend</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
