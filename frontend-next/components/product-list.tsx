"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, PackageSearch, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { signIn, useSession } from "next-auth/react";
import { z } from "zod";
import { fetchProducts, orderProduct } from "@/lib/api";
import { Order, Product } from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

type FeedbackState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const orderSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantity must be greater than 0"),
});

type OrderFormValues = z.output<typeof orderSchema>;
type OrderFormInput = z.input<typeof orderSchema>;

function ProductOrderCard({
  product,
  submitting,
  onSubmit,
}: {
  product: Product;
  submitting: boolean;
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

        <form className="space-y-3" onSubmit={form.handleSubmit((values) => onSubmit(product, values))}>
          <div className="space-y-2">
            <Label htmlFor={`quantity-${product.skuCode}`}>Quantity</Label>
            <Input
              id={`quantity-${product.skuCode}`}
              type="number"
              min="1"
              {...form.register("quantity")}
            />
            <FormMessage>{form.formState.errors.quantity?.message}</FormMessage>
          </div>

          <Button type="submit" className="w-full" disabled={submitting || form.formState.isSubmitting}>
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            {submitting ? "Ordering" : "Order now"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProductList() {
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: "idle" });
  const [loading, setLoading] = useState(true);
  const [submittingSku, setSubmittingSku] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load products";
        setFeedback({ kind: "error", message });
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, []);

  const handleOrder = async (product: Product, values: OrderFormValues) => {
    if (!session?.accessToken || !session.user) {
      await signIn("keycloak");
      return;
    }

    setSubmittingSku(product.skuCode);
    setFeedback({ kind: "idle" });

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

    try {
      await orderProduct(order, session.accessToken);
      setFeedback({ kind: "success", message: "Order placed successfully" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Order failed, please try again later";
      setFeedback({ kind: "error", message });
    } finally {
      setSubmittingSku(null);
    }
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
          {status === "authenticated" ? (
            <Button asChild>
              <Link href="/add-product">Create product</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mb-6 space-y-3">
        {status !== "authenticated" ? (
          <Alert>Login is required before placing orders or creating products.</Alert>
        ) : null}
        {feedback.kind === "success" ? <Alert variant="success">{feedback.message}</Alert> : null}
        {feedback.kind === "error" ? <Alert variant="destructive">{feedback.message}</Alert> : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading products...
        </div>
      ) : null}

      {!loading && products.length === 0 ? (
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
            submitting={submittingSku === product.skuCode}
            onSubmit={handleOrder}
          />
        ))}
      </div>
    </main>
  );
}
