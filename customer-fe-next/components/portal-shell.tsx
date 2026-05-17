"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Store, UserRound } from "lucide-react";

const portals = [
  { href: "/admin", label: "Admin", icon: ShieldCheck },
  { href: "/shop", label: "Shop", icon: Store },
  { href: "/customer", label: "Customer", icon: UserRound },
];

export function PortalShell() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        {portals.map((portal) => {
          const Icon = portal.icon;
          const active = pathname === portal.href || pathname.startsWith(`${portal.href}/`);
          return (
            <Link
              key={portal.href}
              href={portal.href}
              className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {portal.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
