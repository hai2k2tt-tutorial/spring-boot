"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, PackageSearch } from "lucide-react";
import { useSession } from "next-auth/react";
import { fetchCurrentShopProducts } from "@/lib/api";
import { Product } from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="h-full overflow-hidden">
      {product.imageUrl ? (
        <div className="relative h-44 bg-slate-100">
          <Image src={product.imageUrl} alt={product.name} fill unoptimized className="object-cover" />
        </div>
      ) : null}
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{product.name}</CardTitle>
            <CardDescription>{product.description}</CardDescription>
          </div>
          <Badge variant="secondary">${product.price}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
          {product.skuCode ? <Badge variant="outline">SKU {product.skuCode}</Badge> : null}
          <Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status ?? "N/A"}</Badge>
        </div>
        {product.id ? (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/shop/products/${product.id}`}>Manage product</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ProductList() {
  const { status } = useSession();
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchCurrentShopProducts(),
    staleTime: 30 * 1000,
    retry: 1,
  });
  const products = productsQuery.data ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Catalog management UI backed by the Spring Boot gateway.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{products.length} items</Badge>
          {status === "authenticated" ? (
            <Button asChild>
              <Link href="/add-product">Create product</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mb-6 space-y-3">
        {status !== "authenticated" ? <Alert>Login is required before creating products.</Alert> : null}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id ?? product.skuCode} product={product} />
        ))}
      </div>
    </main>
  );
}
