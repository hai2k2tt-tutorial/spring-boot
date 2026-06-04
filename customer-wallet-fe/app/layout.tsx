import type { Metadata } from "next";
import { AuthSync } from "@/components/auth-sync";
import { Header } from "@/components/header";
import { SessionProvider } from "@/components/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Customer Wallet FE",
  description: "Wallet portal",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        <SessionProvider>
          <AuthSync />
          <Header />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
