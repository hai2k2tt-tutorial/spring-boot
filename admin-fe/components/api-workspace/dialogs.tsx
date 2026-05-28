"use client";

import { AttributeDialog } from "@/components/api-workspace/dialogs/attribute-dialog";
import { CategoryDialog } from "@/components/api-workspace/dialogs/category-dialog";
import { OrderDialog } from "@/components/api-workspace/dialogs/order-dialog";
import { PaymentDialog } from "@/components/api-workspace/dialogs/payment-dialog";
import { ProductDialog } from "@/components/api-workspace/dialogs/product-dialog";
import { SkuDialog } from "@/components/api-workspace/dialogs/sku-dialog";
import { StockDialog } from "@/components/api-workspace/dialogs/stock-dialog";

export type DialogName = "product" | "category" | "attribute" | "sku" | "order" | "payment" | "stock" | null;

type DialogProps = {
  dialog: DialogName;
  setDialog: (dialog: DialogName) => void;
  saving: boolean;
  submit: (work: () => Promise<unknown>) => Promise<void>;
};

export function ApiDialogs({ dialog, setDialog, saving, submit }: DialogProps) {
  const closeDialog = () => setDialog(null);

  return (
    <>
      <ProductDialog open={dialog === "product"} onClose={closeDialog} saving={saving} submit={submit} />
      <CategoryDialog open={dialog === "category"} onClose={closeDialog} saving={saving} submit={submit} />
      <AttributeDialog open={dialog === "attribute"} onClose={closeDialog} saving={saving} submit={submit} />
      <SkuDialog open={dialog === "sku"} onClose={closeDialog} saving={saving} submit={submit} />
      <StockDialog open={dialog === "stock"} onClose={closeDialog} />
      <OrderDialog open={dialog === "order"} onClose={closeDialog} saving={saving} submit={submit} />
      <PaymentDialog open={dialog === "payment"} onClose={closeDialog} saving={saving} submit={submit} />
    </>
  );
}
