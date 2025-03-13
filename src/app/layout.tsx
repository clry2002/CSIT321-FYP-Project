import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from '@/contexts/SessionContext';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Clean Next.js App",
  description: "A clean Next.js application with TypeScript and Tailwind CSS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
