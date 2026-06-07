"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { syncCurrentShop } from "@/lib/api";
import { clearAccessToken, setAccessToken } from "@/lib/auth-token";
import {
  hasCrossAppLogin,
  hasCrossAppLogout,
  markCrossAppLogin,
  startCrossAppLogin,
  startCrossAppLogout,
} from "@/lib/cross-app-sso";

export function AuthSync() {
  const { data: session, status } = useSession();
  const syncedTokenRef = useRef<string | null>(null);
  const autoLoginStartedRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && session.accessToken) {
      autoLoginStartedRef.current = false;

      if (hasCrossAppLogout("shop")) {
        syncedTokenRef.current = null;
        clearAccessToken();
        startCrossAppLogout("shop");
        return;
      }

      markCrossAppLogin("shop");
      setAccessToken(session.accessToken, session.accessTokenExpires);
      if (syncedTokenRef.current !== session.accessToken) {
        syncedTokenRef.current = session.accessToken;
        void syncCurrentShop().catch(() => {
          syncedTokenRef.current = null;
        });
      }
      return;
    }

    if (status === "unauthenticated") {
      syncedTokenRef.current = null;
      clearAccessToken();

      if (!autoLoginStartedRef.current && hasCrossAppLogin("shop")) {
        autoLoginStartedRef.current = true;
        startCrossAppLogin("shop");
      }
    }
  }, [session?.accessToken, session?.accessTokenExpires, status]);

  useEffect(() => {
    if (status !== "unauthenticated") return;

    const intervalId = window.setInterval(() => {
      if (autoLoginStartedRef.current || !hasCrossAppLogin("shop")) return;

      autoLoginStartedRef.current = true;
      startCrossAppLogin("shop");
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const intervalId = window.setInterval(() => {
      if (!hasCrossAppLogout("shop")) {
        markCrossAppLogin("shop");
        return;
      }

      syncedTokenRef.current = null;
      clearAccessToken();
      startCrossAppLogout("shop");
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [status]);


  return null;
}
