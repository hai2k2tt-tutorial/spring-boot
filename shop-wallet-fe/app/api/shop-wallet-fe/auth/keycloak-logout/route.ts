import { NextResponse } from "next/server";
import { authBasePath, authCookiePrefix, authIssuer } from "@/auth";

export async function GET() {
  const appUrl = process.env.AUTH_URL ?? "http://localhost:3006";
  const logoutUrl = authIssuer ? new URL(`${authIssuer}/protocol/openid-connect/logout`) : new URL(appUrl);
  logoutUrl.searchParams.set("post_logout_redirect_uri", appUrl);
  const response = NextResponse.redirect(logoutUrl);
  for (const suffix of ["session-token", "callback-url", "csrf-token", "pkce.code_verifier", "state", "nonce"]) {
    response.cookies.set(`${authCookiePrefix}.authjs.${suffix}`, "", { path: "/", maxAge: 0 });
    response.cookies.set(`${authCookiePrefix}.authjs.${suffix}`, "", { path: authBasePath, maxAge: 0 });
  }
  return response;
}
