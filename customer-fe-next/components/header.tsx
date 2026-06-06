"use client";

import Link from "next/link";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { clearAccessToken } from "@/lib/auth-token";
import { beginCrossAppLogin, markCrossAppLogout } from "@/lib/cross-app-sso";

function logout() {
  markCrossAppLogout("customer");
  clearAccessToken();
  window.location.assign("/api/customer-fe-next/auth/keycloak-logout");
}

export function Header() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const username =
    session?.user?.preferred_username ??
    session?.user?.name ??
    session?.user?.email;
  const customerLinks = isAuthenticated
    ? [
        { href: "/dashboard", label: "Products" },
        { href: "/orders", label: "Orders" },
        { href: "/profile", label: "Profile" },
      ]
    : [{ href: "/products", label: "Products" }];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <UserRound className="h-4 w-4" />
          Customer FE Next
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <nav className="flex min-w-0 items-center gap-2 overflow-x-auto">
            {customerLinks.map((link) => (
              <Button key={link.href} asChild variant="secondary" size="sm">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
          {username ? <span className="hidden text-sm text-slate-500 sm:inline">Hi {String(username)}</span> : null}
          {status === "loading" ? null : isAuthenticated ? (
            <Button type="button" variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => beginCrossAppLogin("customer")}>
              <LogIn className="h-4 w-4" />
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
