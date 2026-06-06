"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, LoaderCircle, Mail, PackageSearch, Phone, Store, UserRound } from "lucide-react";
import { use, useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchProducts, fetchShopByProductShopId } from "@/lib/api";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type ShopDetailPageProps = {
  params: Promise<{ shopId: string }>;
};

function formatMoney(value: number, currency = "USD") {
  return currencyFormatter.format(value).replace("$", currency === "USD" ? "$" : `${currency} `);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getShopInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ShopDetailPage({ params }: ShopDetailPageProps) {
  const { shopId } = use(params);

  const shopQuery = useQuery({
    queryKey: ["customer-shop", shopId],
    queryFn: () => fetchShopByProductShopId(shopId),
    enabled: Boolean(shopId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const productsQuery = useQuery({
    queryKey: ["customer-shop-products", shopId],
    queryFn: () => fetchProducts(),
    enabled: Boolean(shopId),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const shop = shopQuery.data;
  const shopProducts = useMemo(() => {
    const products = productsQuery.data ?? [];

    if (!shop) {
      return products.filter((product) => product.shopId === shopId);
    }

    return products.filter((product) => product.shopId === shop.shopId || product.shopId === shop.authId);
  }, [productsQuery.data, shop, shopId]);

  async function refetchShop() {
    await Promise.all([shopQuery.refetch(), productsQuery.refetch()]);
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button asChild variant="outline" size="sm" className="w-fit px-2 text-slate-600">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
        <Button variant="outline" onClick={() => void refetchShop()} disabled={shopQuery.isLoading || productsQuery.isLoading}>
          Refresh
        </Button>
      </div>

      {shopQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading shop detail...
        </div>
      ) : null}

      {shopQuery.isError ? (
        <Alert variant="destructive">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{getErrorMessage(shopQuery.error, "Unable to load shop detail.")}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetchShop()}>
              Retry
            </Button>
          </div>
        </Alert>
      ) : null}

      {shop ? (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-6 text-white sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-2xl font-semibold ring-1 ring-white/20">
                  {getShopInitials(shop.shopName) || <Store className="h-9 w-9" />}
                </div>
                <div className="min-w-0">
                  <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
                    {shop.status}
                  </Badge>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{shop.shopName}</h1>
                  <p className="mt-2 text-sm text-slate-300">Owned by {shop.ownerName}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-100 backdrop-blur">
                {shopProducts.length} products available
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 lg:p-6">
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </CardDescription>
                <CardTitle className="break-all text-base">{shop.email}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </CardDescription>
                <CardTitle className="text-base">{shop.phone || "Not provided"}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  Owner
                </CardDescription>
                <CardTitle className="text-base">{shop.ownerName}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge variant="outline">Shop catalog</Badge>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Products from this shop</h2>
          </div>
          {productsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading products...
            </div>
          ) : null}
        </div>

        {productsQuery.isError ? <Alert variant="destructive">{getErrorMessage(productsQuery.error, "Unable to load shop products.")}</Alert> : null}

        {!productsQuery.isLoading && shopProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <PackageSearch className="h-8 w-8 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">No products found</p>
                <p className="text-sm text-slate-500">This shop does not have products in the customer catalog.</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {shopProducts.map((product) => (
            <Card key={product.id ?? product.name} className="group flex h-full overflow-hidden rounded-2xl border-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-orange-50">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl font-semibold text-slate-300">
                      {product.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <CardHeader className="space-y-2 p-4 pb-2">
                  <Badge variant="outline" className="w-fit rounded-full px-2 py-0 text-[11px]">
                    {product.categoryName ?? product.categoryId ?? "General"}
                  </Badge>
                  <CardTitle className="line-clamp-2 text-base leading-snug sm:text-lg">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-10">{product.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-4 p-4 pt-0">
                  <p className="text-xl font-semibold tracking-tight text-orange-600">{formatMoney(product.price)}</p>
                  {product.id ? (
                    <Button asChild className="w-full bg-slate-950 text-white hover:bg-slate-800 hover:text-white">
                      <Link href={`/products/${product.id}`} className="text-white">
                        View product
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
