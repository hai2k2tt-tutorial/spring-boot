import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { AppSessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: "Admin FE",
  description: "Admin operations frontend for the commerce platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppSessionProvider>
          <Header />
          {children}
        </AppSessionProvider>
      </body>
    </html>
  );
}
