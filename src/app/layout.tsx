import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
<<<<<<< HEAD
=======
import { SessionProvider } from '@/contexts/SessionContext';
>>>>>>> fbdb6d5 (webpage v1.1)

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
<<<<<<< HEAD
      <body className={inter.className}>{children}</body>
=======
      <body className={inter.className}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
>>>>>>> fbdb6d5 (webpage v1.1)
    </html>
  );
}
