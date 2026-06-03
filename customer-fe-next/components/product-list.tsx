"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle, PackageSearch, ShoppingBag } from "lucide-react";
import { fetchProducts } from "@/lib/api";
import { Product } from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatMoney(value: number) {
  return currencyFormatter.format(value);
}

function getProductInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ProductCard({ product }: { product: Product }) {
  const productHref = product.id ? `/products/${product.id}` : undefined;
  const categoryLabel = product.categoryName ?? product.categoryId ?? "General";
  const isActive = product.status === "ACTIVE";

  return (
    <Card className="group flex h-full overflow-hidden rounded-2xl border-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-orange-50">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl font-semibold text-slate-300 sm:text-4xl">
              {getProductInitials(product.name) || <ShoppingBag className="h-10 w-10" />}
            </div>
          )}
          <div className="absolute left-3 top-3">
            <Badge variant={isActive ? "secondary" : "outline"} className="bg-white/90 backdrop-blur">
              {product.status ?? "N/A"}
            </Badge>
          </div>
        </div>

        <CardHeader className="space-y-2 p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <Badge variant="outline" className="max-w-32 truncate rounded-full px-2 py-0 text-[11px] sm:max-w-40">
              {categoryLabel}
            </Badge>
            {product.skuCode ? <span className="truncate text-[11px] text-slate-400">SKU {product.skuCode}</span> : null}
          </div>
          <CardTitle className="line-clamp-2 text-base leading-snug sm:text-lg">{product.name}</CardTitle>
          <CardDescription className="line-clamp-2 min-h-10">{product.description}</CardDescription>
        </CardHeader>

        <CardContent className="mt-auto space-y-4 p-4 pt-0">
          <div>
            <p className="text-xl font-semibold tracking-tight text-orange-600">{formatMoney(product.price)}</p>
            <p className="text-xs text-slate-500">Ready for checkout after SKU selection</p>
          </div>

          {productHref ? (
            <Button asChild className="w-full bg-slate-950 text-white hover:bg-slate-800 hover:text-white">
              <Link href={productHref} className="text-white">
                View details
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button className="w-full" disabled>
              Unavailable
            </Button>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

export function ProductList() {
  const productsQuery = useQuery({
    queryKey: ["customer-products"],
    queryFn: () => fetchProducts(),
    staleTime: 30 * 1000,
    retry: 1,
  });
  const products = productsQuery.data ?? [];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
            Customer catalog
          </Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Products</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Browse the product catalog, open a product card, choose a SKU, and checkout from the detail page.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-white text-slate-950">
            {products.length} items
          </Badge>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        {productsQuery.isError ? (
          <Alert variant="destructive">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{productsQuery.error instanceof Error ? productsQuery.error.message : "Unable to load products"}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void productsQuery.refetch()}>
                Retry
              </Button>
            </div>
          </Alert>
        ) : null}
      </div>

      {productsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading products...
        </div>
      ) : null}

      {!productsQuery.isLoading && products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <PackageSearch className="h-8 w-8 text-slate-400" />
            <div>
              <p className="font-medium text-slate-900">No products found</p>
              <p className="text-sm text-slate-500">The product API returned an empty catalog.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id ?? product.skuCode} product={product} />
        ))}
      </div>
    </main>
  );
}
