"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { attributeSchema } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createAttribute } from "@/lib/api";
import { FormDialogProps } from "./types";

type AttributeDialogProps = FormDialogProps & {
  defaultProductId?: string;
};

const ATTRIBUTE_DEFAULTS = { productId: "", code: "", name: "", values: "" };

export function AttributeDialog({ open, onClose, saving, submit, defaultProductId }: AttributeDialogProps) {
  const form = useForm<z.input<typeof attributeSchema>, undefined, z.output<typeof attributeSchema>>({
    resolver: zodResolver(attributeSchema),
    defaultValues: ATTRIBUTE_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ ...ATTRIBUTE_DEFAULTS, productId: defaultProductId ?? "" });
  }, [defaultProductId, form, open]);

  return (
    <Modal title="Create inventory attribute" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) => {
            const attributeValues = values.values
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
              .map((value, index) => ({ value, sortOrder: index }));
            return submit(() => createAttribute({ ...values, values: attributeValues }));
          })}
        >
          <InputField name="productId" label="Product UUID" />
          <InputField name="code" label="Code" />
          <InputField name="name" label="Name" />
          <InputField name="values" label="Values (comma separated)" className="space-y-2 sm:col-span-2" />
          <Button className="sm:col-span-2" type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            Save attribute
          </Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
