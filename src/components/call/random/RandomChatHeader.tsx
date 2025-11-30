import Link from 'next/link';
import { Bell } from 'lucide-react';

interface RandomChatHeaderProps {
    user: any;
}

export default function RandomChatHeader({ user }: RandomChatHeaderProps) {
    return (
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
    );
}
