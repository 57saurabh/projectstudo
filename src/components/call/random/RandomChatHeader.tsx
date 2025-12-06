import Link from 'next/link';
import { Bell } from 'lucide-react';

interface RandomChatHeaderProps {
    user: any;
}

export default function RandomChatHeader({ user }: RandomChatHeaderProps) {
    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-border px-6 py-3 bg-surface z-10 shadow-sm">
            <div className="flex items-center gap-4 text-text-primary">
                <div className="w-10 h-10 flex items-center justify-center">
                    <img src="/logo.png" alt="Socialin" className="w-full h-full object-contain" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Socialin</h2>
            </div>

            <div className="hidden md:flex flex-1 justify-center items-center gap-4">
                {['#Vibes', '#Music', '#Gaming', '#LateNight'].map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-surface-hover border border-border rounded-full text-xs font-medium text-text-muted hover:border-gold hover:text-gold cursor-pointer transition-all">
                        {tag}
                    </span>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <button className="hidden sm:flex items-center justify-center rounded-2xl h-10 px-6 bg-gold text-white text-sm font-bold hover:bg-gold-hover shadow-gold-glow transition-all">
                    Go Pro
                </button>
                <button className="flex items-center justify-center rounded-full h-10 w-10 bg-surface border border-border text-text-secondary hover:text-gold hover:border-gold transition-colors">
                    <Bell size={20} />
                </button>
                <div className="w-10 h-10 rounded-full border-2 border-gold p-[2px]">
                    <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-bold text-sm text-gold">{user?.displayName?.[0] || 'U'}</span>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
