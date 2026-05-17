"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { signIn, useSession } from "next-auth/react";
import { z } from "zod";
import { createProduct } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/ui/form-message";

const productSchema = z.object({
  skuCode: z.string().trim().min(1, "SKU code is required"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().min(1, "Description is required"),
  price: z.coerce.number().positive("Price must be greater than 0"),
});

type ProductFormValues = z.output<typeof productSchema>;
type ProductFormInput = z.input<typeof productSchema>;

export function AddProductForm() {
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const form = useForm<ProductFormInput, undefined, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      skuCode: "",
      name: "",
      description: "",
      price: "0",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    if (!session?.accessToken) {
      await signIn("keycloak");
      return;
    }

    setError(null);
    setCreated(false);

    try {
      await createProduct(values, session.accessToken);
      setCreated(true);
      form.reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create product");
    }
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Add product</h1>
          <p className="mt-1 text-sm text-slate-500">Create a catalog item through the API gateway.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product details</CardTitle>
          <CardDescription>Validated with react-hook-form and zod.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            {status !== "authenticated" ? (
              <Alert>Login is required to create products.</Alert>
            ) : null}
            {created ? <Alert variant="success">Product created successfully.</Alert> : null}
            {error ? <Alert variant="destructive">{error}</Alert> : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="skuCode">SKU code</Label>
                <Input id="skuCode" {...form.register("skuCode")} />
                <FormMessage>{form.formState.errors.skuCode?.message}</FormMessage>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register("name")} />
                <FormMessage>{form.formState.errors.name?.message}</FormMessage>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={5} {...form.register("description")} />
              <FormMessage>{form.formState.errors.description?.message}</FormMessage>
            </div>

            <div className="max-w-xs space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" min="0.01" step="0.01" {...form.register("price")} />
              <FormMessage>{form.formState.errors.price?.message}</FormMessage>
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {form.formState.isSubmitting ? "Saving" : "Add product"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
