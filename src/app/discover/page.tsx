'use client';

import { Search } from 'lucide-react';

export default function DiscoverPage() {
    return (
        <div className="h-full bg-background text-text-primary p-6 md:p-10 flex flex-col items-center justify-center gap-6">
            <div className="w-24 h-24 rounded-full bg-surface border-2 border-gold flex items-center justify-center text-gold shadow-gold-glow">
                <Search size={48} />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-primary">Discover</h1>
            <p className="text-text-secondary text-lg max-w-md text-center">
                Find new friends, groups, and communities. Coming soon!
            </p>
        </div>
    );
}
