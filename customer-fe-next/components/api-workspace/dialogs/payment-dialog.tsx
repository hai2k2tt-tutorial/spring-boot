"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { paymentSchema } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createPayment, fetchCurrentCustomerOrders } from "@/lib/api";
import type { OrderResponseVo } from "@/lib/types";
import { FormDialogProps } from "./types";

type OrderOption = {
  label: string;
  value: string;
};

const paymentMethods: Array<"BALANCE" | "CARD" | "MANUAL"> = ["BALANCE", "CARD", "MANUAL"];

export function PaymentDialog({ open, onClose, saving, submit }: FormDialogProps) {
  const form = useForm<z.input<typeof paymentSchema>, undefined, z.output<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { orderId: "", method: "BALANCE" },
  });
  const ordersQuery = useQuery<OrderResponseVo[]>({
    queryKey: ["customer-order-options"],
    queryFn: () => fetchCurrentCustomerOrders(),
    enabled: open,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const orderOptions: OrderOption[] = useMemo(
    () => (ordersQuery.data ?? []).map((order) => ({ label: order.orderNumber, value: order.id })),
    [ordersQuery.data],
  );
  const orderPlaceholder = ordersQuery.isLoading
    ? "Loading orders..."
    : ordersQuery.isError
      ? "Unable to load orders"
      : orderOptions.length
        ? "Select order"
        : "No orders available";

  return (
    <Modal title="Create payment" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => submit(() => createPayment(values)))}>
          <SelectField
            name="orderId"
            label="Order"
            options={orderOptions}
            placeholder={orderPlaceholder}
            disabled={ordersQuery.isLoading || ordersQuery.isError}
          />
          <SelectField name="method" label="Method" options={paymentMethods} />
          <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save payment</Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
