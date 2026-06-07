"use client";

import { signIn, signOut } from "next-auth/react";

export type SsoRealm = "customer" | "shop";

const ACTIVE_COOKIE_MAX_AGE_SECONDS = 5 * 60;
const PENDING_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const LOGOUT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;
const LEGACY_SHARED_AUTH_COOKIE_PREFIXES = ["customer-sso", "shop-fe"] as const;
const LEGACY_SHARED_AUTH_COOKIE_NAMES = [
  "session-token",
  "callback-url",
  "csrf-token",
  "pkce.code_verifier",
  "state",
  "nonce",
] as const;

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

function deleteSharedDomainCookie(name: string): void {
  const domain = sharedCookieDomain();
  if (!domain) return;

  document.cookie = [
    `${name}=`,
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
    `Domain=${domain}`,
  ].join("; ");
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
  writeCookie(cookieName(realm), `active:${Date.now()}`, ACTIVE_COOKIE_MAX_AGE_SECONDS);
}

export function markCrossAppLogout(realm: SsoRealm): void {
  writeCookie(cookieName(realm), `logout:${Date.now()}`, LOGOUT_COOKIE_MAX_AGE_SECONDS);
}

export function markCrossAppLoginPending(realm: SsoRealm): void {
  writeCookie(cookieName(realm), `pending:${Date.now()}`, PENDING_COOKIE_MAX_AGE_SECONDS);
}

export function hasCrossAppLogin(realm: SsoRealm): boolean {
  return readMarker(realm)?.startsWith("active:") ?? false;
}

export function hasCrossAppLogout(realm: SsoRealm): boolean {
  return readMarker(realm)?.startsWith("logout:") ?? false;
}

export function cleanupLegacySharedAuthCookies(): void {
  for (const prefix of LEGACY_SHARED_AUTH_COOKIE_PREFIXES) {
    for (const name of LEGACY_SHARED_AUTH_COOKIE_NAMES) {
      deleteSharedDomainCookie(`${prefix}.authjs.${name}`);
      deleteSharedDomainCookie(`__Secure-${prefix}.authjs.${name}`);
    }

    for (let index = 0; index < 10; index += 1) {
      deleteSharedDomainCookie(`${prefix}.authjs.session-token.${index}`);
      deleteSharedDomainCookie(`__Secure-${prefix}.authjs.session-token.${index}`);
    }
  }
}

export function beginCrossAppLogin(realm: SsoRealm): void {
  // Do not mark active until Auth.js has a real local session.
  // Otherwise sibling apps may attempt prompt=none while this app is still on the Keycloak login form.
  markCrossAppLoginPending(realm);
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
