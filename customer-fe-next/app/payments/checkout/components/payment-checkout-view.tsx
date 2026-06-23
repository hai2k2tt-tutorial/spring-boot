"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, LoaderCircle, ReceiptText, Wallet } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createAsyncPayment, fetchOrder } from "@/lib/api";
import { PaymentMethod, PaymentResponseVo } from "@/lib/types";
import { MockProviderActions } from "./mock-provider-actions";

type PaymentCheckoutViewProps = {
  orderId?: string;
  method: PaymentMethod;
  initialPaymentId?: string;
  initialClientSecret?: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatMoney(value: number) {
  return currencyFormatter.format(value);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getPaymentUrl(payment: PaymentResponseVo) {
  return payment.paymentUrl ?? payment.payment_url;
}

function getClientSecret(payment: PaymentResponseVo) {
  return payment.clientSecret ?? payment.client_secret;
}

export function PaymentCheckoutView({ orderId, method, initialPaymentId, initialClientSecret }: PaymentCheckoutViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ["customer-order", orderId],
    queryFn: () => fetchOrder(orderId ?? ""),
    enabled: Boolean(orderId),
    staleTime: 10 * 1000,
    retry: 1,
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      createAsyncPayment({
        orderId: orderId ?? "",
        method,
      }),
    onSuccess: async (payment) => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["customer-order", orderId] }),
        queryClient.invalidateQueries({ queryKey: ["customer-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-wallet-transactions"] }),
      ]);

      if (payment.method === "BALANCE" && payment.status === "SUCCESS") {
        router.push(`/orders/${payment.orderId}`);
        return;
      }

      const paymentUrl = getPaymentUrl(payment);
      if (paymentUrl && !paymentUrl.includes("/payments/checkout")) {
        window.location.assign(paymentUrl);
      }
    },
  });

  const payment = paymentMutation.data;
  const paymentId = payment?.id ?? initialPaymentId;
  const clientSecret = payment ? getClientSecret(payment) : initialClientSecret;
  const isWallet = method === "BALANCE";
  const canPay = Boolean(orderId) && !paymentMutation.isPending && orderQuery.data?.status !== "PAID";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl items-center px-4 py-8 sm:px-6">
      <Card className="w-full overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
          <Badge variant="secondary">PAYMENT</Badge>
          <h1 className="mt-3 text-3xl font-semibold">Complete order payment</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            The order is pending payment. Review the total, then pay to create and complete the payment step.
          </p>
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isWallet ? <Wallet className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            {isWallet ? "Wallet payment" : "Mock provider payment"}
          </CardTitle>
          <CardDescription>
            {isWallet
              ? "Paying from wallet debits your balance, credits shop wallets, and marks the order paid."
              : "Create the payment session, then complete the mock provider result."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!orderId ? (
            <Alert variant="destructive">Missing order information. Return to the product page and create the order again.</Alert>
          ) : null}

          {orderQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading order...
            </div>
          ) : null}
          {orderQuery.isError ? <Alert variant="destructive">{getErrorMessage(orderQuery.error, "Unable to load order.")}</Alert> : null}

          {orderQuery.data ? (
            <div className="grid gap-3 rounded-md border border-slate-200 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-slate-500">Order ID</p>
                <p className="break-all font-medium text-slate-950">{orderQuery.data.id}</p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <p className="font-medium text-slate-950">{orderQuery.data.status}</p>
              </div>
              <div>
                <p className="text-slate-500">Payment method</p>
                <p className="font-medium text-slate-950">{method}</p>
              </div>
              <div>
                <p className="text-slate-500">Total</p>
                <p className="font-semibold text-slate-950">{formatMoney(Number(orderQuery.data.totalAmount ?? 0))}</p>
              </div>
            </div>
          ) : null}

          {payment ? (
            <div className="grid gap-3 rounded-md border border-slate-200 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-slate-500">Payment ID</p>
                <p className="break-all font-medium text-slate-950">{payment.id}</p>
              </div>
              <div>
                <p className="text-slate-500">Payment status</p>
                <p className="font-medium text-slate-950">{payment.status}</p>
              </div>
              <div>
                <p className="text-slate-500">Session</p>
                <p className="font-medium text-slate-950">{payment.sessionStatus ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-slate-500">Client secret</p>
                <p className="break-all font-medium text-slate-950">{clientSecret ?? "Not returned"}</p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={!canPay} onClick={() => paymentMutation.mutate()}>
              {paymentMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : isWallet ? <Wallet className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              {payment ? "Retry payment" : "Pay"}
            </Button>
            <Button asChild variant="outline">
              <Link href={orderId ? `/orders/${orderId}` : "/products"}>
                <ReceiptText className="h-4 w-4" />
                View order
              </Link>
            </Button>
          </div>

          {paymentMutation.isPending ? <Alert>Creating payment...</Alert> : null}
          {paymentMutation.isError ? (
            <Alert variant="destructive">{getErrorMessage(paymentMutation.error, "Unable to create payment.")}</Alert>
          ) : null}
          {(payment && payment.method !== "BALANCE") || initialPaymentId ? (
            <MockProviderActions paymentId={paymentId} clientSecret={clientSecret} orderId={payment?.orderId ?? orderId} />
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
