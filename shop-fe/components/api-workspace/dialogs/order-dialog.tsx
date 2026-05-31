"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { orderSchema } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { placeOrder } from "@/lib/api";
import { FormDialogProps } from "./types";

type OrderDialogProps = FormDialogProps & {
  defaultSkuCode?: string;
};

const ORDER_DEFAULTS = { skuCode: "", quantity: "1" };

export function OrderDialog({ open, onClose, saving, submit, defaultSkuCode }: OrderDialogProps) {
  const form = useForm<z.input<typeof orderSchema>, undefined, z.output<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: ORDER_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ ...ORDER_DEFAULTS, skuCode: defaultSkuCode ?? "" });
  }, [defaultSkuCode, form, open]);

  return (
    <Modal title="Create order" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) =>
            submit(() => placeOrder({ items: [{ skuCode: values.skuCode, quantity: values.quantity }] }))
          )}
        >
          <InputField name="skuCode" label="SKU code" />
          <InputField name="quantity" label="Quantity" type="number" />
          <Button className="sm:col-span-2" type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            Save order
          </Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
