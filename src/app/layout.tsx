import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/lib/store/ReduxProvider";
import AuthGuard from "@/components/auth/AuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import { CameraGuard } from '@/components/utils/CameraGuard';

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "VIBE // Real-Time Video Chat",
  description: "Gen-Z Random Video Chat Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} bg-background text-white min-h-screen overflow-hidden`}>
        <ReduxProvider>
          <CameraGuard />
          <AuthGuard>
            <AppLayout>
              {children}
            </AppLayout>
          </AuthGuard>
        </ReduxProvider>
      </body>
    </html>
  );
}
