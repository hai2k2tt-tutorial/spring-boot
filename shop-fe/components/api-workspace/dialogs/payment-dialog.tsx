"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField, SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { paymentSchema } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createPayment } from "@/lib/api";
import { FormDialogProps } from "./types";

export function PaymentDialog({ open, onClose, saving, submit }: FormDialogProps) {
  const form = useForm<z.input<typeof paymentSchema>, undefined, z.output<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { orderId: "", method: "BALANCE" },
  });

  return (
    <Modal title="Create payment" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => submit(() => createPayment(values)))}>
          <InputField name="orderId" label="Order UUID" />
          <SelectField name="method" label="Method" options={["BALANCE", "CARD", "MANUAL"]} />
          <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save payment</Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
