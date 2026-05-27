"use client";

import { OrderDialog } from "@/components/api-workspace/dialogs/order-dialog";
import { PaymentDialog } from "@/components/api-workspace/dialogs/payment-dialog";

export type DialogName = "order" | "payment" | null;

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
      <OrderDialog open={dialog === "order"} onClose={closeDialog} saving={saving} submit={submit} />
      <PaymentDialog open={dialog === "payment"} onClose={closeDialog} saving={saving} submit={submit} />
    </>
  );
}
