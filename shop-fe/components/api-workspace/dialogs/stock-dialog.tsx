"use client";

import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCcw } from "lucide-react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { stockSchema } from "@/components/api-workspace/schemas";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { checkStock } from "@/lib/api";
import { InventoryCheckResponseVo } from "@/lib/types";

type StockDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function StockDialog({ open, onClose }: StockDialogProps) {
  const [stockResult, setStockResult] = useState<InventoryCheckResponseVo | null>(null);
  const stockMutation = useMutation({
    mutationFn: async (values: z.output<typeof stockSchema>) => checkStock(values.skuCode, values.quantity),
    onSuccess: setStockResult,
  });
  const form = useForm<z.input<typeof stockSchema>, undefined, z.output<typeof stockSchema>>({
    resolver: zodResolver(stockSchema),
    defaultValues: { skuCode: "", quantity: "1" },
  });

  return (
    <Modal title="Check stock" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit((values) => stockMutation.mutate(values))}>
          <InputField name="skuCode" label="SKU code" />
          <InputField name="quantity" label="Quantity" type="number" />
          {stockResult ? <Alert variant={stockResult.inStock ? "success" : "destructive"}>{stockResult.skuCode}: {stockResult.inStock ? "In stock" : "Not enough stock"}</Alert> : null}
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
