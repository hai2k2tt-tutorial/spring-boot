"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField, SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { attributeSchema } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createAttribute } from "@/lib/api";
import { FormDialogProps } from "./types";

export function AttributeDialog({ open, onClose, saving, submit }: FormDialogProps) {
  const form = useForm<z.input<typeof attributeSchema>, undefined, z.output<typeof attributeSchema>>({
    resolver: zodResolver(attributeSchema),
    defaultValues: { productId: "", code: "", name: "", inputType: "SELECT" },
  });

  return (
    <Modal title="Create inventory attribute" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => submit(() => createAttribute(values)))}>
          <InputField name="productId" label="Product UUID" />
          <InputField name="code" label="Code" />
          <InputField name="name" label="Name" />
          <SelectField name="inputType" label="Input type" options={["SELECT", "TEXT"]} />
          <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save attribute</Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
