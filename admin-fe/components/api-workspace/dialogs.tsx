"use client";

import { AttributeDialog } from "@/components/api-workspace/dialogs/attribute-dialog";
import { CategoryDialog } from "@/components/api-workspace/dialogs/category-dialog";
import { SkuDialog } from "@/components/api-workspace/dialogs/sku-dialog";
import { StockDialog } from "@/components/api-workspace/dialogs/stock-dialog";

export type DialogName = "category" | "attribute" | "sku" | "stock" | null;

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
      <CategoryDialog open={dialog === "category"} onClose={closeDialog} saving={saving} submit={submit} />
      <AttributeDialog open={dialog === "attribute"} onClose={closeDialog} saving={saving} submit={submit} />
      <SkuDialog open={dialog === "sku"} onClose={closeDialog} saving={saving} submit={submit} />
      <StockDialog open={dialog === "stock"} onClose={closeDialog} />
    </>
  );
}
