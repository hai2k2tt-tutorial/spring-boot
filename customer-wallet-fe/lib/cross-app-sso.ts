"use client";

import { signIn, signOut } from "next-auth/react";

export type SsoRealm = "customer" | "shop";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

function cookieName(realm: SsoRealm): string {
  return `portal-sso.${realm}`;
}

function sharedCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.hostname.endsWith(".haint.fyi") ? ".haint.fyi" : undefined;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  const domain = sharedCookieDomain();
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax",
    domain ? `Domain=${domain}` : "",
  ].filter(Boolean).join("; ");
}

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}

function readMarker(realm: SsoRealm): string | undefined {
  const value = readCookie(cookieName(realm));
  return value ? decodeURIComponent(value) : undefined;
}

export function markCrossAppLogin(realm: SsoRealm): void {
  writeCookie(cookieName(realm), `active:${Date.now()}`, COOKIE_MAX_AGE_SECONDS);
}

export function markCrossAppLogout(realm: SsoRealm): void {
  writeCookie(cookieName(realm), `logout:${Date.now()}`, COOKIE_MAX_AGE_SECONDS);
}

export function hasCrossAppLogin(realm: SsoRealm): boolean {
  return readMarker(realm)?.startsWith("active:") ?? false;
}

export function hasCrossAppLogout(realm: SsoRealm): boolean {
  return readMarker(realm)?.startsWith("logout:") ?? false;
}

export function beginCrossAppLogin(realm: SsoRealm): void {
  markCrossAppLogin(realm);
  void signIn("keycloak");
}

export function startCrossAppLogin(realm: SsoRealm): void {
  if (!hasCrossAppLogin(realm)) return;

  void signIn("keycloak", { callbackUrl: window.location.href }, { prompt: "none" });
}

export function startCrossAppLogout(realm: SsoRealm): void {
  if (!hasCrossAppLogout(realm)) return;

  void signOut({ redirect: false });
}
