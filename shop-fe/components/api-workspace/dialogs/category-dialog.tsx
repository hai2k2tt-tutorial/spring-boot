"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { categorySchema, toOptional } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createCategory } from "@/lib/api";
import { FormDialogProps } from "./types";

export function CategoryDialog({ open, onClose, saving, submit }: FormDialogProps) {
  const form = useForm<z.input<typeof categorySchema>, undefined, z.output<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", parentId: "" },
  });

  return (
    <Modal title="Create category" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit((values) => submit(() => createCategory({ name: values.name, parentId: toOptional(values.parentId) })))}>
          <InputField name="name" label="Name" />
          <InputField name="parentId" label="Parent UUID" />
          <Button type="submit" disabled={saving}><Save className="h-4 w-4" />Save category</Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
