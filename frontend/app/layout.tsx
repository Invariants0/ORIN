import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/core/ui/tooltip";
import { Toaster } from "@/components/core/ui/sonner";
import { QueryProvider } from "@/providers/query-provider";
import { WebSocketProvider } from "@/providers/websocket-provider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ORIN - Context Operating System",
  description: "Transform Notion into a structured, actionable memory layer with AI-powered command-driven interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Suspense fallback={null}>
          <AuthProvider>
            <QueryProvider>
              <WebSocketProvider>
                <TooltipProvider>
                  {children}
                  <Toaster />
                </TooltipProvider>
              </WebSocketProvider>
            </QueryProvider>
          </AuthProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
