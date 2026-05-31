"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField, SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { paymentSchema } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createPayment } from "@/lib/api";
import { FormDialogProps } from "./types";

type PaymentDialogProps = FormDialogProps & {
  defaultOrderId?: string;
};

const PAYMENT_DEFAULTS = { orderId: "", method: "BALANCE" as const };

export function PaymentDialog({ open, onClose, saving, submit, defaultOrderId }: PaymentDialogProps) {
  const form = useForm<z.input<typeof paymentSchema>, undefined, z.output<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: PAYMENT_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ ...PAYMENT_DEFAULTS, orderId: defaultOrderId ?? "" });
  }, [defaultOrderId, form, open]);

  return (
    <Modal title="Create payment" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) => submit(() => createPayment(values)))}
        >
          <InputField name="orderId" label="Order UUID" />
          <SelectField name="method" label="Method" options={["BALANCE", "CARD", "MANUAL"]} />
          <Button className="sm:col-span-2" type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            Save payment
          </Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
