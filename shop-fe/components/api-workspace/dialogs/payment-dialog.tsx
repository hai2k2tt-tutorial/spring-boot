"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { paymentSchema } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createPayment, fetchOrders } from "@/lib/api";
import { DialogErrorAlert, getErrorMessage } from "./error-alert";
import { FormDialogProps } from "./types";

type PaymentDialogProps = FormDialogProps & {
  defaultOrderId?: string;
};

const PAYMENT_DEFAULTS = { orderId: "", method: "BALANCE" as const };

export function PaymentDialog({ open, onClose, saving, submit, defaultOrderId }: PaymentDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<z.input<typeof paymentSchema>, undefined, z.output<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: PAYMENT_DEFAULTS,
  });
  const ordersQuery = useQuery({
    queryKey: ["shop-order-options"],
    queryFn: () => fetchOrders(),
    enabled: open,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const orderOptions = useMemo(
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

  useEffect(() => {
    if (!open) return;
    form.reset({ ...PAYMENT_DEFAULTS, orderId: defaultOrderId ?? "" });
  }, [defaultOrderId, form, open]);

  async function handleSubmit(values: z.output<typeof paymentSchema>) {
    setServerError(null);
    try {
      await submit(() => createPayment(values));
    } catch (error) {
      setServerError(getErrorMessage(error, "Unable to create payment"));
    }
  }

  function handleClose() {
    setServerError(null);
    onClose();
  }

  return (
    <Modal title="Create payment" open={open} onClose={handleClose}>
      <FormProvider {...form}>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <DialogErrorAlert message={serverError} />
          <SelectField
            name="orderId"
            label="Order"
            options={orderOptions}
            placeholder={orderPlaceholder}
            disabled={ordersQuery.isLoading || ordersQuery.isError}
          />
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
