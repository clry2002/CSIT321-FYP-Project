import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from '@/contexts/SessionContext';
import ClientAuthWrapper from './components/ClientAuthWrapper';
import QueryProvider from '../providers/QueryProvider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CoReadability",
  description: "A friendly reading companion that helps young readers discover stories they'll love",
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
          <QueryProvider>
            <ClientAuthWrapper>
              {children}
            </ClientAuthWrapper>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}