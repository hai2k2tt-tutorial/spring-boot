"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField, SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { orderSchema } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { placeOrder } from "@/lib/api";
import { FormDialogProps } from "./types";

export function OrderDialog({ open, onClose, saving, submit }: FormDialogProps) {
  const form = useForm<z.input<typeof orderSchema>, undefined, z.output<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: { customerId: "", status: "PENDING", email: "", firstName: "", lastName: "", skuId: "", skuCode: "", productId: "", shopId: "", price: "0", quantity: "1" },
  });

  return (
    <Modal title="Create order" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => submit(() => placeOrder({
          customerId: values.customerId,
          status: values.status,
          customerDetails: { email: values.email, firstName: values.firstName, lastName: values.lastName },
          items: [{ skuId: values.skuId, skuCode: values.skuCode, productId: values.productId, shopId: values.shopId, price: values.price, quantity: values.quantity }],
        })))}>
          {(["customerId", "email", "firstName", "lastName", "skuId", "skuCode", "productId", "shopId", "price", "quantity"] as const).map((name) => <InputField key={name} name={name} label={name} type={name === "price" || name === "quantity" ? "number" : "text"} />)}
          <SelectField name="status" label="Status" options={["PENDING", "PAID", "CANCELED"]} />
          <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save order</Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
