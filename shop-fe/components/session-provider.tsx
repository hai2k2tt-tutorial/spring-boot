"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { PropsWithChildren } from "react";
import { useState } from "react";
import { AuthSync } from "@/components/auth-sync";

export function AppSessionProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider basePath="/api/shop-fe/auth">
      <QueryClientProvider client={queryClient}>
        <AuthSync />
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
