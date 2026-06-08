import Link from "next/link";
import { ArrowRight, Package, ShieldCheck, ShoppingBag, Store, UserRound, Wallet } from "lucide-react";
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
  { label: "Add funds in wallet", icon: Wallet },
  { label: "Browse & buy products", icon: ShoppingBag },
  { label: "Create product, SKU & orders", icon: Package },
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
                    {portal.walletHref ? (
                      <p className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                        SSO guide: open the portal first to sign in, then use the wallet button to continue with the same
                        session.
                      </p>
                    ) : (
                      <p className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                        Default Keycloak credentials: <code className="rounded bg-slate-200 px-1 py-px text-slate-950">admin</code>{" "}
                        / <code className="rounded bg-slate-200 px-1 py-px text-slate-950">admin</code>
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-950">Main Features</h2>

          {/* Wallet */}
          <div className="mt-8">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Wallet className="h-4 w-4 text-slate-600" />
              Add funds in wallet
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { step: "Open wallet", detail: "Click Open customer wallet or Open shop wallet from the portal card above." },
                { step: "Sign in with Keycloak", detail: "Use the same SSO session from the Customer or Shop portal." },
                { step: "Check balance & transfer", detail: "View your current balance and add funds from the wallet dashboard." },
              ].map((item, i) => (
                <div key={item.step} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {i + 1}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.step}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Customer flow */}
          <div className="mt-10">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <ShoppingBag className="h-4 w-4 text-slate-600" />
              Buy product flow &mdash; for user
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              {[
                { step: "Browse catalog", detail: "Open the Customer Portal and browse available products across shops." },
                { step: "Select product", detail: "Click a product to see details, price, SKU attributes, and shop info." },
                { step: "Place order", detail: "Add to cart and confirm the order from the checkout page." },
                { step: "Track order", detail: "View order status and payment confirmation in your order history." },
              ].map((item, i) => (
                <div key={item.step} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {i + 1}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.step}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Shop flow */}
          <div className="mt-10">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Package className="h-4 w-4 text-slate-600" />
              Create product, attribute, SKU &amp; check orders &mdash; for shop
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              {[
                { step: "Create product", detail: "Open the Shop Portal, navigate to Add Product, and fill in name, price, and description." },
                { step: "Add attributes", detail: "Define product attributes (size, color, material) so customers can pick variants." },
                { step: "Configure SKUs", detail: "Create SKUs tied to attribute combinations with stock quantity and pricing." },
                { step: "Check orders", detail: "View incoming orders, verify payment status, and manage order fulfillment." },
              ].map((item, i) => (
                <div key={item.step} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {i + 1}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.step}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
