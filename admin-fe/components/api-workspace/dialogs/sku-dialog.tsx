"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { skuSchema } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createSku } from "@/lib/api";
import { FormDialogProps } from "./types";

export function SkuDialog({ open, onClose, saving, submit }: FormDialogProps) {
  const form = useForm<z.input<typeof skuSchema>, undefined, z.output<typeof skuSchema>>({
    resolver: zodResolver(skuSchema),
    defaultValues: { productId: "", skuCode: "", priceOverride: "0", quantity: "0", attributeValueIds: "" },
  });

  return (
    <Modal title="Create SKU" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => submit(() => createSku({ ...values, attributeValueIds: values.attributeValueIds ? values.attributeValueIds.split(",").map((id) => id.trim()).filter(Boolean) : [] })))}>
          <InputField name="productId" label="Product UUID" />
          <InputField name="skuCode" label="SKU code" />
          <InputField name="priceOverride" label="Price override" type="number" />
          <InputField name="quantity" label="Quantity" type="number" />
          <InputField name="attributeValueIds" label="Attribute value UUIDs, comma separated" className="space-y-2 sm:col-span-2" />
          <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save SKU</Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
