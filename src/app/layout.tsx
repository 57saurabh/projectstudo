import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/lib/store/ReduxProvider";
import NotificationManager from '@/components/notifications/NotificationManager';
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { SignalingProvider } from "@/lib/webrtc/SignalingContext";
import AuthGuard from "@/components/auth/AuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import { CameraGuard } from '@/components/utils/CameraGuard';
import AuthInitializer from "@/components/auth/AuthInitializer";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} bg-background text-white min-h-screen overflow-hidden`} suppressHydrationWarning>
        <ReduxProvider>
          <ThemeProvider>
            <SignalingProvider>
              <NotificationManager />
              <SidebarProvider>
                <AuthInitializer />
                <CameraGuard />
                <AuthGuard>
                  <AppLayout>
                    {children}
                  </AppLayout>
                </AuthGuard>
              </SidebarProvider>
            </SignalingProvider>
          </ThemeProvider>
        </ReduxProvider>
        <Script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js" strategy="lazyOnload" />
        <Script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js" strategy="lazyOnload" />
        <Script src="https://cdn.jsdelivr.net/npm/nsfwjs@latest/dist/nsfwjs.min.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
