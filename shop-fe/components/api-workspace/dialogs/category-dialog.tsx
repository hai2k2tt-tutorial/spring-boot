"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField, SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { categorySchema, toOptional } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createCategory, fetchCategories } from "@/lib/api";
import { FormDialogProps } from "./types";

export function CategoryDialog({ open, onClose, saving, submit }: FormDialogProps) {
  const form = useForm<z.input<typeof categorySchema>, undefined, z.output<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", parentId: "" },
  });
  const categoriesQuery = useQuery({
    queryKey: ["shop-category-options"],
    queryFn: () => fetchCategories(),
    enabled: open,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const categoryOptions = useMemo(
    () => (categoriesQuery.data ?? []).map((category) => ({ label: category.name, value: category.id })),
    [categoriesQuery.data],
  );
  const parentPlaceholder = categoriesQuery.isLoading
    ? "Loading categories..."
    : categoriesQuery.isError
      ? "Unable to load categories"
      : "No parent";

  return (
    <Modal title="Create category" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit((values) => submit(() => createCategory({ name: values.name, parentId: toOptional(values.parentId) })))}>
          <InputField name="name" label="Name" />
          <SelectField
            name="parentId"
            label="Parent category"
            options={categoryOptions}
            placeholder={parentPlaceholder}
            disabled={categoriesQuery.isLoading || categoriesQuery.isError}
          />
          <Button type="submit" disabled={saving}><Save className="h-4 w-4" />Save category</Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
