"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { syncCurrentCustomer } from "@/lib/api";
import { clearAccessToken, setAccessToken } from "@/lib/auth-token";

export function AuthSync() {
  const { data: session, status } = useSession();
  const syncedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session.accessToken) {
      setAccessToken(session.accessToken, session.accessTokenExpires);
      if (syncedTokenRef.current !== session.accessToken) {
        syncedTokenRef.current = session.accessToken;
        void syncCurrentCustomer().catch(() => {
          syncedTokenRef.current = null;
        });
      }
      return;
    }

    if (status === "unauthenticated") {
      syncedTokenRef.current = null;
      clearAccessToken();
    }
  }, [session?.accessToken, session?.accessTokenExpires, status]);

  return null;
}
