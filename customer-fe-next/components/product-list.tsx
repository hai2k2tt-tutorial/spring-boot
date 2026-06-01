"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle, PackageSearch } from "lucide-react";
import { fetchProducts } from "@/lib/api";
import { Product } from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{product.name}</CardTitle>
            <CardDescription>{product.description}</CardDescription>
          </div>
          <Badge variant="secondary">${product.price}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
          {product.skuCode ? <Badge variant="outline">SKU {product.skuCode}</Badge> : null}
          <Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status ?? "N/A"}</Badge>
        </div>

        <Button asChild className="w-full" disabled={!product.id}>
          <Link href={product.id ? `/products/${product.id}` : "#"}>
            Details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function ProductList() {
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    staleTime: 30 * 1000,
    retry: 1,
  });
  const products = productsQuery.data ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Catalog and ordering UI backed by the Spring Boot gateway.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{products.length} items</Badge>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id ?? product.skuCode} product={product} />
        ))}
      </div>
    </main>
  );
}
