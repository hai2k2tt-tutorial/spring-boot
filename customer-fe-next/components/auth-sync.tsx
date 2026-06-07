"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { syncCurrentCustomer } from "@/lib/api";
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

      if (hasCrossAppLogout("customer")) {
        syncedTokenRef.current = null;
        clearAccessToken();
        startCrossAppLogout("customer");
        return;
      }

      markCrossAppLogin("customer");
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

      if (!autoLoginStartedRef.current && hasCrossAppLogin("customer")) {
        autoLoginStartedRef.current = true;
        startCrossAppLogin("customer");
      }
    }
  }, [session?.accessToken, session?.accessTokenExpires, status]);

  useEffect(() => {
    if (status !== "unauthenticated") return;

    const intervalId = window.setInterval(() => {
      if (autoLoginStartedRef.current || !hasCrossAppLogin("customer")) return;

      autoLoginStartedRef.current = true;
      startCrossAppLogin("customer");
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const intervalId = window.setInterval(() => {
      if (!hasCrossAppLogout("customer")) {
        markCrossAppLogin("customer");
        return;
      }

      syncedTokenRef.current = null;
      clearAccessToken();
      startCrossAppLogout("customer");
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [status]);


  return null;
}
