import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { authBasePath, authCookieDomain, authCookiePrefix, authIssuer } from "@/auth";

const sessionCookieName = `${authCookiePrefix}.authjs.session-token`;

const apiBaseUrl =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:9000/api";

function getAppBaseUrl(request: NextRequest): string {
  return (process.env.AUTH_URL ?? request.nextUrl.origin).replace(/\/$/, "");
}

function getApiBaseUrl(): string {
  return apiBaseUrl.replace(/\/$/, "");
}

function buildPostLogoutRedirectUri(request: NextRequest): string {
  return getAppBaseUrl(request);
}

function buildKeycloakLogoutUrl(request: NextRequest, idToken?: string): string {
  if (!authIssuer) {
    return buildPostLogoutRedirectUri(request);
  }

  const logoutUrl = new URL(`${authIssuer}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set("post_logout_redirect_uri", buildPostLogoutRedirectUri(request));

  if (idToken) {
    logoutUrl.searchParams.set("id_token_hint", idToken);
  } else if (process.env.AUTH_CLIENT_ID) {
    logoutUrl.searchParams.set("client_id", process.env.AUTH_CLIENT_ID);
  }

  return logoutUrl.toString();
}

async function blackListAccessToken(accessToken?: string): Promise<void> {
  if (!accessToken) {
    return;
  }

  try {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error("Failed to blacklist access token", error);
  }
}

function expireAuthCookies(request: NextRequest, response: NextResponse): void {
  const authCookieNamePrefix = `${authCookiePrefix}.authjs.`;

  request.cookies.getAll().forEach((cookie) => {
    if (!cookie.name.startsWith(authCookieNamePrefix)) {
      return;
    }

    for (const path of [authBasePath, "/"]) {
      response.cookies.set({
        name: cookie.name,
        value: "",
        expires: new Date(0),
        maxAge: 0,
        path,
        ...(authCookieDomain ? { domain: authCookieDomain } : {}),
      });
    }
  });
}

export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: sessionCookieName,
  });

  const accessToken = typeof token?.accessToken === "string" ? token.accessToken : undefined;
  const idToken = typeof token?.idToken === "string" ? token.idToken : undefined;

  await blackListAccessToken(accessToken);

  const response = NextResponse.redirect(buildKeycloakLogoutUrl(request, idToken));
  expireAuthCookies(request, response);
  return response;
}
