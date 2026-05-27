"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { clearAccessToken, setAccessToken } from "@/lib/auth-token";

export function AuthSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session.accessToken) {
      setAccessToken(session.accessToken, session.accessTokenExpires);
      return;
    }

    if (status === "unauthenticated") {
      clearAccessToken();
    }
  }, [session?.accessToken, session?.accessTokenExpires, status]);

  return null;
}
