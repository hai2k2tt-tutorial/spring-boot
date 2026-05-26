"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, PackageSearch, ShoppingCart } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { signIn, useSession } from "next-auth/react";
import { z } from "zod";
import { fetchProducts, orderProduct } from "@/lib/api";
import { Order, Product } from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputField } from "@/components/forms";

const orderSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantity must be greater than 0"),
});

type OrderFormValues = z.output<typeof orderSchema>;
type OrderFormInput = z.input<typeof orderSchema>;

function ProductOrderCard({
  product,
  isSubmitting,
  onSubmit,
}: {
  product: Product;
  isSubmitting: boolean;
  onSubmit: (product: Product, values: OrderFormValues) => Promise<void>;
}) {
  const form = useForm<OrderFormInput, undefined, OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      quantity: "1",
    },
  });

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
          <Badge variant="outline">SKU {product.skuCode}</Badge>
        </div>

        <FormProvider {...form}>
          <form className="space-y-3" onSubmit={form.handleSubmit((values) => onSubmit(product, values))}>
            <InputField name="quantity" label="Quantity" id={`quantity-${product.skuCode}`} type="number" min="1" />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              {isSubmitting ? "Ordering" : "Order now"}
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}

export function ProductList() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    staleTime: 30 * 1000,
    retry: 1,
  });
  const products = productsQuery.data ?? [];
  const orderMutation = useMutation({
    mutationFn: ({ order }: { skuCode: string; order: Order }) => {
      if (!session?.accessToken) {
        throw new Error("Login is required before placing orders.");
      }

      return orderProduct(order, session.accessToken);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleOrder = async (product: Product, values: OrderFormValues) => {
    if (!session?.accessToken || !session.user) {
      await signIn("keycloak");
      return;
    }

    const order: Order = {
      skuCode: product.skuCode,
      price: product.price,
      quantity: values.quantity,
      userDetails: {
        email: String(session.user.email ?? ""),
        firstName: String(session.user.given_name ?? ""),
        lastName: String(session.user.family_name ?? ""),
      },
    };

    await orderMutation.mutateAsync({ skuCode: product.skuCode, order });
  };

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
        {status !== "authenticated" ? (
          <Alert>Login is required before placing orders.</Alert>
        ) : null}
        {orderMutation.isSuccess ? <Alert variant="success">Order placed successfully</Alert> : null}
        {orderMutation.isError ? (
          <Alert variant="destructive">
            {orderMutation.error instanceof Error ? orderMutation.error.message : "Order failed, please try again later"}
          </Alert>
        ) : null}
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
          <ProductOrderCard
            key={product.id ?? product.skuCode}
            product={product}
            isSubmitting={orderMutation.isPending && orderMutation.variables?.skuCode === product.skuCode}
            onSubmit={handleOrder}
          />
        ))}
      </div>
    </main>
  );
}
