"use client";

import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCcw } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { stockSchema } from "@/components/api-workspace/schemas";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { checkStock } from "@/lib/api";
type StockDialogProps = {
  open: boolean;
  onClose: () => void;
  defaultSkuCode?: string | null;
};

const STOCK_DEFAULTS = { skuCode: "", quantity: "1" };

export function StockDialog({ open, onClose, defaultSkuCode }: StockDialogProps) {
  const stockMutation = useMutation({
    mutationFn: async (values: z.output<typeof stockSchema>) => checkStock(values.skuCode, values.quantity),
  });
  const form = useForm<z.input<typeof stockSchema>, undefined, z.output<typeof stockSchema>>({
    resolver: zodResolver(stockSchema),
    defaultValues: STOCK_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ ...STOCK_DEFAULTS, skuCode: defaultSkuCode ?? "" });
  }, [defaultSkuCode, form, open]);

  function handleClose() {
    stockMutation.reset();
    onClose();
  }

  return (
    <Modal title="Check stock" open={open} onClose={handleClose}>
      <FormProvider {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit((values) => stockMutation.mutate(values))}>
          <InputField name="skuCode" label="SKU code" />
          <InputField name="quantity" label="Quantity" type="number" />
          {stockMutation.data ? <Alert variant={stockMutation.data.inStock ? "success" : "destructive"}>{stockMutation.data.skuCode}: {stockMutation.data.inStock ? "In stock" : "Not enough stock"}</Alert> : null}
          {stockMutation.isError ? <Alert variant="destructive">{stockMutation.error instanceof Error ? stockMutation.error.message : "Unable to check stock"}</Alert> : null}
          <Button type="submit" disabled={stockMutation.isPending}>
            <RefreshCcw className={`h-4 w-4 ${stockMutation.isPending ? "animate-spin" : ""}`} />
            {stockMutation.isPending ? "Checking" : "Check stock"}
          </Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
