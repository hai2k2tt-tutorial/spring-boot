import Link from "next/link";
import { PageHeader } from "@/components/portal-page";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="ADMIN PORTAL"
        title="Admin workspace"
        description="Sign in to manage catalog, shops, customers, and payments. The dashboard hosts the API workspace lists and actions."
      />
      <div className="flex flex-wrap gap-3">
        <Button asChild className="bg-slate-950 text-white hover:bg-slate-800 hover:text-white">
          <Link href="/dashboard" className="text-white">
            Open dashboard
          </Link>
        </Button>
      </div>
      <p className="text-sm text-slate-600">
        Use the Login button in the header to authenticate before opening the
        dashboard.
      </p>
    </main>
  );
}
