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
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';

import GlobalCallHandler from "@/components/call/GlobalCallHandler";
import IncomingCallBanner from "@/components/call/private/IncomingCallBanner";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "Socialin // Real-Time Video Chat",
  description: "Gen-Z Random Video Chat Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} bg-background text-primary min-h-screen overflow-hidden`} suppressHydrationWarning>
        <ReduxProvider>
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
            <ThemeProvider>
              <SignalingProvider>
                <NotificationManager />
                <GlobalCallHandler />
                <IncomingCallBanner />
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
          </GoogleOAuthProvider>
        </ReduxProvider>
        <Script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js" strategy="lazyOnload" />
        <Script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js" strategy="lazyOnload" />
        <Script src="https://cdn.jsdelivr.net/npm/nsfwjs@latest/dist/nsfwjs.min.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
