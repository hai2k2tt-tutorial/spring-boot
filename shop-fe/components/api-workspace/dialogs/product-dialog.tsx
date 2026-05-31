"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField, SelectField, TextareaField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { productSchema, toOptional } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createProduct } from "@/lib/api";
import { FormDialogProps } from "./types";

export function ProductDialog({ open, onClose, saving, submit }: FormDialogProps) {
  const form = useForm<z.input<typeof productSchema>, undefined, z.output<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", description: "", price: "0", imageUrl: "", categoryId: "", status: "DRAFT" },
  });

  return (
    <Modal title="Create product" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => submit(() => createProduct({ ...values, categoryId: toOptional(values.categoryId), imageUrl: toOptional(values.imageUrl) })))}>
          <InputField name="name" label="Name" />
          <InputField name="price" label="Price" type="number" />
          <InputField name="categoryId" label="Category UUID" />
          <SelectField name="status" label="Status" options={["DRAFT", "ACTIVE", "ARCHIVED"]} />
          <InputField name="imageUrl" label="Image URL" />
          <TextareaField name="description" label="Description" className="space-y-2 sm:col-span-2" />
          <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save product</Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
