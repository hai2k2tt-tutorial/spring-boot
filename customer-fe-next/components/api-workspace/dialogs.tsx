"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { createPayment, placeOrder } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { orderSchema, paymentSchema } from "@/components/api-workspace/schemas";

export type DialogName = "order" | "payment" | null;

type DialogProps = {
  dialog: DialogName;
  setDialog: (dialog: DialogName) => void;
  saving: boolean;
  submit: (work: (token?: string) => Promise<unknown>) => Promise<void>;
};

export function ApiDialogs({ dialog, setDialog, saving, submit }: DialogProps) {
  const orderForm = useForm<z.input<typeof orderSchema>, undefined, z.output<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: { customerId: "", status: "PENDING", email: "", firstName: "", lastName: "", skuId: "", skuCode: "", productId: "", shopId: "", price: "0", quantity: "1" },
  });
  const paymentForm = useForm<z.input<typeof paymentSchema>, undefined, z.output<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { customerId: "", orderId: "", amount: "0", method: "BALANCE", status: "PENDING" },
  });

  return (
    <>
      <Modal title="Create order" open={dialog === "order"} onClose={() => setDialog(null)}>
        <FormProvider {...orderForm}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={orderForm.handleSubmit((values) => submit((token) => placeOrder({
            customerId: values.customerId,
            status: values.status,
            customerDetails: { email: values.email, firstName: values.firstName, lastName: values.lastName },
            items: [{ skuId: values.skuId, skuCode: values.skuCode, productId: values.productId, shopId: values.shopId, price: values.price, quantity: values.quantity }],
          }, token)))}>
            {(["customerId", "email", "firstName", "lastName", "skuId", "skuCode", "productId", "shopId", "price", "quantity"] as const).map((name) => <InputField key={name} name={name} label={name} type={name === "price" || name === "quantity" ? "number" : "text"} />)}
            <SelectField name="status" label="Status" options={["PENDING", "PAID", "CANCELED"]} />
            <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save order</Button>
          </form>
        </FormProvider>
      </Modal>

      <Modal title="Create payment" open={dialog === "payment"} onClose={() => setDialog(null)}>
        <FormProvider {...paymentForm}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={paymentForm.handleSubmit((values) => submit((token) => createPayment(values, token)))}>
            <InputField name="customerId" label="Customer UUID" />
            <InputField name="orderId" label="Order UUID" />
            <InputField name="amount" label="Amount" type="number" />
            <SelectField name="method" label="Method" options={["BALANCE", "CARD", "MANUAL"]} />
            <SelectField name="status" label="Status" options={["PENDING", "SUCCESS", "FAILED"]} />
            <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save payment</Button>
          </form>
        </FormProvider>
      </Modal>
    </>
  );
}
