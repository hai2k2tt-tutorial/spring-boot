"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { signIn, useSession } from "next-auth/react";
import { useMemo } from "react";
import { z } from "zod";
import { createProduct, fetchCategories } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputField, SelectField, TextareaField } from "@/components/forms";

const productSchema = z.object({
  categoryId: z.string().trim().uuid("Use a valid category UUID"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().min(1, "Description is required"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  imageUrl: z.string().trim().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

type ProductFormValues = z.output<typeof productSchema>;
type ProductFormInput = z.input<typeof productSchema>;

export function AddProductForm() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const form = useForm<ProductFormInput, undefined, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      categoryId: "",
      name: "",
      description: "",
      price: "0",
      imageUrl: "",
      status: "DRAFT",
    },
  });
  const categoriesQuery = useQuery({
    queryKey: ["shop-category-options"],
    queryFn: () => fetchCategories(),
    staleTime: 30 * 1000,
    retry: 1,
  });
  const categoryOptions = useMemo(
    () => (categoriesQuery.data ?? []).map((category) => ({ label: category.name, value: category.id })),
    [categoriesQuery.data],
  );
  const categoryPlaceholder = categoriesQuery.isLoading
    ? "Loading categories..."
    : categoriesQuery.isError
      ? "Unable to load categories"
      : categoryOptions.length
        ? "Select category"
        : "No categories available";

  const createProductMutation = useMutation({
    mutationFn: (values: ProductFormValues) => createProduct(values),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["api-workspace-products"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const submit = form.handleSubmit(async (values) => {
    if (status !== "authenticated") {
      await signIn("keycloak");
      return;
    }

    await createProductMutation.mutateAsync(values);
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
          <FormProvider {...form}>
            <form className="space-y-5" onSubmit={submit}>
              {status !== "authenticated" ? (
                <Alert>Login is required to create products.</Alert>
              ) : null}
              {createProductMutation.isSuccess ? <Alert variant="success">Product created successfully.</Alert> : null}
              {createProductMutation.isError ? (
                <Alert variant="destructive">
                  {createProductMutation.error instanceof Error ? createProductMutation.error.message : "Failed to create product"}
                </Alert>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  name="categoryId"
                  label="Category"
                  options={categoryOptions}
                  placeholder={categoryPlaceholder}
                  disabled={categoriesQuery.isLoading || categoriesQuery.isError}
                />
                <InputField name="name" label="Name" />
                <SelectField name="status" label="Status" options={["DRAFT", "ACTIVE", "ARCHIVED"]} />
              </div>

              <TextareaField name="description" label="Description" rows={5} />

              <InputField name="price" label="Price" type="number" min="0.01" step="0.01" className="max-w-xs space-y-2" />
              <InputField name="imageUrl" label="Image URL" />

              <Button type="submit" disabled={createProductMutation.isPending}>
                {createProductMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {createProductMutation.isPending ? "Saving" : "Add product"}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </main>
  );
}
