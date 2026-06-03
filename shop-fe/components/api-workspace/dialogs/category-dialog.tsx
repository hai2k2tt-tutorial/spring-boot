"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField, SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { categorySchema, toOptional } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createCategory, fetchCategories } from "@/lib/api";
import { buildCategoryTreeOptions } from "@/lib/category-options";
import { DialogErrorAlert, getErrorMessage } from "./error-alert";
import { FormDialogProps } from "./types";

export function CategoryDialog({ open, onClose, saving, submit }: FormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
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
    () => buildCategoryTreeOptions(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );
  const parentPlaceholder = categoriesQuery.isLoading
    ? "Loading categories..."
    : categoriesQuery.isError
      ? "Unable to load categories"
      : "No parent";

  async function handleSubmit(values: z.output<typeof categorySchema>) {
    setServerError(null);
    try {
      await submit(() => createCategory({ name: values.name, parentId: toOptional(values.parentId) }));
    } catch (error) {
      setServerError(getErrorMessage(error, "Unable to create category"));
    }
  }

  function handleClose() {
    setServerError(null);
    onClose();
  }

  return (
    <Modal title="Create category" open={open} onClose={handleClose}>
      <FormProvider {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <DialogErrorAlert message={serverError} className="" />
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
