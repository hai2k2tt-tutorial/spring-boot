"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField, SelectField, TextareaField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { productSchema, toOptional } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createProduct, fetchCategories } from "@/lib/api";
import { buildCategoryTreeOptions } from "@/lib/category-options";
import { FormDialogProps } from "./types";

export function ProductDialog({ open, onClose, saving, submit }: FormDialogProps) {
  const form = useForm<z.input<typeof productSchema>, undefined, z.output<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", description: "", price: "0", imageUrl: "", categoryId: "", status: "DRAFT" },
  });
  const categoriesQuery = useQuery({
    queryKey: ["shop-category-options"],
    queryFn: () => fetchCategories(),
    enabled: open,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const categoryOptions = useMemo(
    () => buildCategoryTreeOptions(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );
  const categoryPlaceholder = categoriesQuery.isLoading
    ? "Loading categories..."
    : categoriesQuery.isError
      ? "Unable to load categories"
      : categoryOptions.length
        ? "Select category"
        : "No categories available";

  return (
    <Modal title="Create product" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => submit(() => createProduct({ ...values, categoryId: toOptional(values.categoryId), imageUrl: toOptional(values.imageUrl) })))}>
          <InputField name="name" label="Name" />
          <InputField name="price" label="Price" type="number" />
          <SelectField
            name="categoryId"
            label="Category"
            options={categoryOptions}
            placeholder={categoryPlaceholder}
            disabled={categoriesQuery.isLoading || categoriesQuery.isError}
          />
          <SelectField name="status" label="Status" options={["DRAFT", "ACTIVE", "ARCHIVED"]} />
          <InputField name="imageUrl" label="Image URL" />
          <TextareaField name="description" label="Description" className="space-y-2 sm:col-span-2" />
          <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save product</Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
