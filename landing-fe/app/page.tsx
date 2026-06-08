import Link from "next/link";
import { ArrowRight, Boxes, CreditCard, ShieldCheck, ShoppingBag, Store, UserRound, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const capabilities = [
  { label: "Product catalog", icon: Boxes },
  { label: "Order lifecycle", icon: ShoppingBag },
  { label: "Payment tracking", icon: CreditCard },
];

export default function HomePage() {
  const adminUrl = requiredEnv("NEXT_PUBLIC_ADMIN_FE_URL");
  const shopUrl = requiredEnv("NEXT_PUBLIC_SHOP_FE_URL");
  const customerUrl = requiredEnv("NEXT_PUBLIC_CUSTOMER_FE_URL");
  const customerWalletUrl = requiredEnv("NEXT_PUBLIC_CUSTOMER_WALLET_FE_URL");
  const shopWalletUrl = requiredEnv("NEXT_PUBLIC_SHOP_WALLET_FE_URL");

  const portals = [
    {
      title: "Admin Portal",
      description: "Manage catalog data, attributes, inventory, payments, and platform operations.",
      href: adminUrl,
      icon: ShieldCheck,
      cta: "Open admin",
    },
    {
      title: "Customer Portal",
      description: "Continue into customer account, order, and payment workflows.",
      href: customerUrl,
      icon: UserRound,
      cta: "Open customer",
      walletHref: customerWalletUrl,
      walletCta: "Open customer wallet",
    },
    {
      title: "Shop Portal",
      description: "Run seller workflows for products, SKUs, stock, orders, and payment tracking.",
      href: shopUrl,
      icon: Store,
      cta: "Open shop",
      walletHref: shopWalletUrl,
      walletCta: "Open shop wallet",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <ShoppingBag className="h-4 w-4" />
            Commerce Management Hub
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-white">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            Commerce Management Hub
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            One public landing page for the ecommerce platform. Select the workspace for your role and continue to the
            dedicated frontend service.
          </p>

          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {capabilities.map((capability) => {
              const Icon = capability.icon;

              return (
                <div
                  key={capability.label}
                  className="flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4"
                >
                  <Icon className="h-5 w-5 shrink-0 text-slate-700" />
                  <span className="text-sm font-medium text-slate-700">{capability.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4">
          {portals.map((portal) => {
            const Icon = portal.icon;

            return (
              <article key={portal.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-900">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">{portal.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{portal.description}</p>
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-56">
                    <div className="grid gap-2">
                      <Button asChild className="w-full">
                        <Link href={portal.href}>
                          {portal.cta}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      {portal.walletHref ? (
                        <Button asChild variant="outline" className="w-full">
                          <Link href={portal.walletHref}>
                            <Wallet className="h-4 w-4" />
                            {portal.walletCta}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                    <p className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                      SSO guide: open the portal first to sign in, then use the wallet button to continue with the same
                      session.
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-950">About the app</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
            The ecommerce system is split into focused frontend services for admin, customer, shop, and wallet users. This
            landing service gives you one domain to publish, bookmark, or route through a load balancer while each
            workspace keeps its own authentication realm and deployment lifecycle.
          </p>
        </div>
      </section>
    </main>
  );
}
