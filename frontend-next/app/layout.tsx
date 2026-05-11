import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { AppSessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: "Spring Boot Microservices Shop",
  description: "Next.js storefront for the Spring Boot microservices sample",
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
