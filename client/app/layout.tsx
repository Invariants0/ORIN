import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '700', '900'],
});

export const metadata: Metadata = {
  title: 'ORIN — YOUR BRAIN OPERATING SYSTEM',
  description: 'Orin turns Notion into a living memory. Read, structure, and act on your knowledge across every workflow with Gemini.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body suppressHydrationWarning className="bg-white text-black font-sans selection:bg-[#ffe17c] selection:text-black">
        {children}
      </body>
    </html>
  );
}
