'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/navigation/Sidebar';
import Header from '@/components/layout/Header';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { useRef, useEffect } from 'react';

function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/';
    const { isOpen } = useSidebar();
    const mainRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTop = 0;
        }
    }, [pathname]);

    return (
        <div className="flex min-h-screen bg-background overflow-hidden transition-colors duration-300">
            {!isAuthPage && <Sidebar />}
            <main
                ref={mainRef}
                className={`flex-1 transition-all duration-300 ease-in-out h-screen overflow-y-auto flex flex-col ${!isAuthPage ? 'w-full' : ''
                    }`}
            >
                {!isAuthPage && <Header />}
                <div className="flex-1 p-2 lg:p-4">
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
