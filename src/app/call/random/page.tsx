'use client';
import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useWebRTC } from '@/lib/webrtc/useWebRTC';
import { useCallStore } from '@/lib/store/useCallStore';
import { Mic, MicOff, Video, VideoOff, PhoneOff, SkipForward, UserPlus, Flag, Send, Bell } from 'lucide-react';
import Link from 'next/link';
import LocalVideo from '@/components/video/LocalVideo';
import RemoteVideo from '@/components/video/RemoteVideo';

export default function RandomChatPage() {
    const { user } = useSelector((state: RootState) => state.auth);
    const { findMatch, sendMessage, skipMatch, socket, addRandomUser, pendingMatch, acceptMatch } = useWebRTC();
    const { participants, messages, isMuted, isVideoOff, toggleMute, toggleVideo, mediaError, remoteStreams } = useCallStore();

    const [inputMessage, setInputMessage] = useState('');
    const [userCount, setUserCount] = useState(0);
    const [showChat, setShowChat] = useState(true);
    const [canAddFriend, setCanAddFriend] = useState(false);
    const [countdown, setCountdown] = useState(30);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // In random chat, we assume the first participant is the peer
    const currentPeer = participants[0];
    const currentPeerId = currentPeer?.id;

    // Countdown logic for pending match
    useEffect(() => {
        if (pendingMatch) {
            setCountdown(30);
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        acceptMatch(); // Auto-accept
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [pendingMatch, acceptMatch]);

    useEffect(() => {
        // Auto-start searching when page loads
        findMatch();

        if (socket) {
            socket.on('user-count', (count: number) => {
                setUserCount(count);
            });
        }

        return () => {
            socket?.off('user-count');
        };
    }, [findMatch, socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Friend Request Timer (3 minutes)
    useEffect(() => {
        if (currentPeerId) {
            const timer = setTimeout(() => {
                setCanAddFriend(true);
            }, 180000); // 3 minutes

            return () => clearTimeout(timer);
        } else {
            setCanAddFriend(false);
        }
    }, [currentPeerId]);

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputMessage.trim() || !currentPeerId) return;

        sendMessage(currentPeerId, inputMessage);
        setInputMessage('');
    };

    const handleSkip = () => {
        if (currentPeerId) {
            skipMatch(currentPeerId);
        } else {
            findMatch(); // If no peer, just search
        }
    };

    const handleSkipPending = () => {
        skipMatch(pendingMatch?.peerId);
    };

    const handleAddFriend = () => {
        // Mock friend request logic
        alert('Friend request sent!');
    };

    const handleAddRandomUser = () => {
        addRandomUser();
        alert('Searching for another user to add...');
    };

    return (
        <div className="relative flex h-screen w-full flex-col bg-[#f7f6f8] dark:bg-[#191121] font-sans overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-6 py-3 bg-[#191121] z-10">
                <div className="flex items-center gap-4 text-white">
                    <div className="w-8 h-8 bg-[#7f19e6] rounded-full flex items-center justify-center font-bold text-lg">Z</div>
                    <h2 className="text-lg font-bold">Zylo</h2>
                </div>
                <div className="hidden md:flex flex-1 justify-center items-center gap-9">
                    <span className="text-white text-sm font-medium px-3 py-2 bg-[#7f19e6]/20 rounded-lg cursor-pointer">Random Chat</span>
                    <span className="text-white/70 hover:text-white text-sm font-medium cursor-pointer transition-colors">Friends</span>
                    <span className="text-white/70 hover:text-white text-sm font-medium cursor-pointer transition-colors">Groups</span>
                    <Link href="/developer/online-users">
                        <span className="text-white/70 hover:text-white text-sm font-medium cursor-pointer transition-colors">Online Users</span>
                    </Link>
                </div>
                <div className="flex items-center gap-3">
                    <button className="hidden sm:flex items-center justify-center rounded-lg h-10 px-4 bg-[#7f19e6] text-white text-sm font-bold hover:bg-[#6d14c4] transition-colors">
                        Go Pro
                    </button>
                    <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-white/10 text-white hover:bg-white/20 transition-colors">
                        <Bell size={20} />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7f19e6] to-blue-500 p-[2px]">
                        <div className="w-full h-full rounded-full bg-[#191121] flex items-center justify-center overflow-hidden">
                            <span className="font-bold text-sm text-white">{user?.displayName?.[0] || 'U'}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 overflow-hidden">

                {/* Video Area */}
                <div className="flex-1 relative flex flex-col justify-end items-center bg-black/50 rounded-xl overflow-hidden border border-white/10">

                    {/* Pending Match Overlay */}
                    {pendingMatch && (
                        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                            <h3 className="text-2xl font-bold text-white mb-6">Match Found!</h3>

                            <div className="relative mb-8">
                                <div className="w-32 h-32 rounded-full border-4 border-[#7f19e6] overflow-hidden bg-gray-800">
                                    <img
                                        src={pendingMatch.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pendingMatch.peerId}`}
                                        alt="Peer Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-500/30 flex items-center gap-1">
                                    <span className="text-yellow-400 text-sm font-bold">★ {pendingMatch.reputation || 100}</span>
                                </div>
                            </div>

                            <p className="text-white/60 mb-8 max-w-xs">
                                Connecting automatically in <span className="text-white font-bold">{countdown}s</span>...
                            </p>

                            <div className="flex gap-4 w-full max-w-xs">
                                <button
                                    onClick={handleSkipPending}
                                    className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={acceptMatch}
                                    className="flex-1 py-3 rounded-xl bg-[#7f19e6] text-white font-bold hover:bg-[#6d14c4] transition-colors shadow-lg shadow-[#7f19e6]/20"
                                >
                                    Connect Now
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Remote Videos Grid */}
                    <div className={`absolute inset-0 w-full h-full bg-[#1a1a1a] p-4 grid gap-4 ${participants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {participants.length > 0 ? (
                            participants.map((participant) => (
                                <div key={participant.id} className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center border border-white/10 group">
                                    {/* Remote Video Element */}
                                    <RemoteVideo
                                        stream={remoteStreams[participant.id]}
                                        isMuted={participant.isMuted}
                                        isVideoOff={participant.isVideoOff}
                                        avatarUrl={participant.avatarUrl}
                                        displayName={participant.displayName}
                                    />

                                    {/* Reputation Badge */}
                                    {participant.reputation !== undefined && (
                                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-500/30 flex items-center gap-2 z-20">
                                            <span className="text-yellow-400 text-xs font-bold">★ {participant.reputation}</span>
                                        </div>
                                    )}

                                    <div className="absolute bottom-4 left-4 text-white font-medium z-20 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                                        {participant.displayName}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-4">
                                <div className="animate-spin w-8 h-8 border-4 border-[#7f19e6] border-t-transparent rounded-full"></div>
                                <p className="text-white/50">Searching for a match...</p>
                            </div>
                        )}
                    </div>

                    {/* Tags Overlay */}
                    <div className="absolute top-4 left-4 flex gap-2 z-20">
                        {['USA', 'English', 'Gaming'].map(tag => (
                            <div key={tag} className="flex h-8 items-center justify-center rounded-lg bg-black/30 backdrop-blur-sm px-3 text-white border border-white/5">
                                <p className="text-sm font-medium">{tag}</p>
                            </div>
                        ))}
                        <div className="flex h-8 items-center justify-center rounded-lg bg-red-500/20 backdrop-blur-sm px-3 text-red-400 border border-red-500/20 animate-pulse">
                            <p className="text-sm font-bold flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                {userCount} LIVE
                            </p>
                        </div>
                    </div>

                    {/* Local Video */}
                    <div className="absolute top-4 right-4 w-32 sm:w-40 md:w-56 aspect-[4/3] z-20">
                        <LocalVideo />
                    </div>

                    {/* Error Toast */}
                    {mediaError && (
                        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium">
                            {mediaError}
                        </div>
                    )}

                    {/* Controls */}
                    <div className="relative mb-6 flex justify-center z-10">
                        <div className="flex items-center gap-3 rounded-xl bg-black/40 backdrop-blur-xl p-2 border border-white/10 shadow-2xl">
                            <button
                                onClick={toggleMute}
                                className={`p-3 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                            >
                                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                            </button>
                            <button
                                onClick={toggleVideo}
                                className={`p-3 rounded-lg transition-colors ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                            >
                                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                            </button>
                            <Link href="/dashboard">
                                <button className="p-3 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors mx-2">
                                    <PhoneOff size={24} />
                                </button>
                            </Link>
                            <button
                                onClick={handleSkip}
                                className="p-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                                title="Skip"
                            >
                                <SkipForward size={24} />
                            </button>

                            <div className="w-px h-6 bg-white/20 mx-1"></div>

                            {/* Add Friend Button (Visible after 3 mins) */}
                            {canAddFriend && (
                                <button
                                    onClick={handleAddFriend}
                                    className="p-3 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors animate-pulse"
                                    title="Add Friend"
                                >
                                    <UserPlus size={24} />
                                </button>
                            )}

                            {/* Multi-user Add Button */}
                            <button
                                onClick={handleAddRandomUser}
                                className="p-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                                title="Add Random User"
                            >
                                <UserPlus size={24} />
                            </button>

                            {/* Chat Toggle */}
                            <button
                                onClick={() => setShowChat(!showChat)}
                                className={`p-3 rounded-lg transition-colors ${showChat ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'}`}
                                title="Toggle Chat"
                            >
                                <Send size={24} className={showChat ? "" : "opacity-50"} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                {showChat && (
                    <div className="w-full lg:w-[360px] flex-shrink-0 flex flex-col bg-[#191121]/50 rounded-xl overflow-hidden border border-white/10 h-[300px] lg:h-auto transition-all duration-300">
                        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex items-end gap-3 ${msg.senderId === user?.id ? 'justify-end' : ''}`}>
                                    {msg.senderId !== user?.id && !msg.isSystem && (
                                        <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0" />
                                    )}
                                    <div className={`flex flex-col gap-1 ${msg.senderId === user?.id ? 'items-end' : 'items-start'} ${msg.isSystem ? 'w-full items-center' : ''}`}>
                                        {!msg.isSystem && <p className="text-white/60 text-[13px] font-medium">{msg.senderName}</p>}
                                        <div className={`max-w-[240px] rounded-lg px-3 py-2 text-white text-sm ${msg.isSystem ? 'bg-white/5 text-xs text-center italic' : (msg.senderId === user?.id ? 'bg-[#7f19e6]' : 'bg-white/10')}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                    {msg.senderId === user?.id && !msg.isSystem && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7f19e6] to-blue-500 flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t border-white/10 bg-[#191121]">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 border border-white/10 focus-within:border-[#7f19e6]/50 transition-colors">
                                <input
                                    className="flex-1 bg-transparent text-white placeholder:text-white/50 text-sm border-0 focus:ring-0 p-0 h-10"
                                    placeholder={currentPeerId ? "Send a message..." : "Waiting for match..."}
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    disabled={!currentPeerId}
                                />
                                <button
                                    type="submit"
                                    disabled={!currentPeerId || !inputMessage.trim()}
                                    className="p-2 text-white/70 hover:text-[#7f19e6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
