import Link from "next/link";
import { PageHeader } from "@/components/portal-page";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="CUSTOMER PORTAL"
        title="Customer workspace"
        description="Sign in to browse products, manage orders, and review payments. The dashboard contains the API workspace lists and actions."
      />
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/dashboard">Open dashboard</Link>
        </Button>
      </div>
      <p className="text-sm text-slate-600">
        Use the Login button in the header to authenticate before opening the
        dashboard.
      </p>
    </main>
  );
}
