"use client";

import Link from "next/link";
import { LogIn, LogOut, Store } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const username = session?.user?.name ?? session?.user?.email;
  const shopLinks = isAuthenticated
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/profile", label: "Profile" },
      ]
    : [];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <Store className="h-4 w-4" />
          Shop FE
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <nav className="flex min-w-0 items-center gap-2 overflow-x-auto">
            {shopLinks.map((link) => (
              <Button key={link.href} asChild variant="secondary" size="sm">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
          {username ? <span className="hidden text-sm text-slate-500 sm:inline">Hi {String(username)}</span> : null}
          {status === "loading" ? null : isAuthenticated ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => void signIn("keycloak")}>
              <LogIn className="h-4 w-4" />
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
