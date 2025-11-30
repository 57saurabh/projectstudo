'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/navigation/Sidebar';
import { SidebarProvider, useSidebar } from './SidebarContext';

function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/';
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen bg-[#f7f6f8] dark:bg-[#191121] overflow-hidden">
            {!isAuthPage && <Sidebar />}
            <main
                className={`flex-1 transition-all duration-300 ease-in-out h-screen overflow-y-auto ${!isAuthPage ? 'w-full' : ''
                    }`}
            >
                {children}
            </main>
        </div>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <LayoutContent>{children}</LayoutContent>
        </SidebarProvider>
    );
}
