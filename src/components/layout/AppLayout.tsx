'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/navigation/Sidebar';
import Header from '@/components/layout/Header';
import { SidebarProvider, useSidebar } from './SidebarContext';

function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/';
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-[#0f0a15] overflow-hidden transition-colors duration-300">
            {!isAuthPage && <Sidebar />}
            <main
                className={`flex-1 transition-all duration-300 ease-in-out h-screen overflow-y-auto flex flex-col ${!isAuthPage ? 'w-full' : ''
                    }`}
            >
                {!isAuthPage && <Header />}
                <div className="flex-1 p-4">
                    {children}
                </div>
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
