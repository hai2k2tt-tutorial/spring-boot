"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { use, useState } from "react";
import { PaymentDialog } from "@/components/api-workspace/dialogs/payment-dialog";
import { ApiTable, EmptyRow } from "@/components/api-workspace/primitives";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { fetchCurrentShopOrder, fetchPayments } from "@/lib/api";
import { OrderItemResponseVo } from "@/lib/types";

type Feedback = { kind: "success" | "error"; message: string } | null;

type OrderDetailPageProps = {
  params: Promise<{ orderId: string }>;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function shopOrderTotal(order?: { items?: OrderItemResponseVo[] }) {
  return order?.items?.reduce((total, item) => total + Number(item.price) * item.quantity, 0) ?? 0;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = use(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const handleSubmit = async (work: () => Promise<unknown>) => {
    await submitMutation.mutateAsync(work);
  };

  const orderQuery = useQuery({
    queryKey: ["shop-order", orderId],
    queryFn: () => fetchCurrentShopOrder(orderId),
    enabled: !!orderId,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const paymentsQuery = useQuery({
    queryKey: ["shop-order-payments", orderId],
    queryFn: () => fetchPayments({ orderId }),
    enabled: !!orderId,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const submitMutation = useMutation({
    mutationFn: async (work: () => Promise<unknown>) => work(),
    onSuccess: async () => {
      setFeedback({ kind: "success", message: "Payment created." });
      await Promise.allSettled([orderQuery.refetch(), paymentsQuery.refetch()]);
      setDialogOpen(false);
    },
    onError: (error) => {
      setFeedback({ kind: "error", message: getErrorMessage(error, "API request failed") });
    },
  });

  const loading = orderQuery.isLoading || paymentsQuery.isLoading;
  const isError = orderQuery.isError || paymentsQuery.isError;
  const order = orderQuery.data;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" size="sm" className="w-fit px-2 text-slate-600">
            <Link href="/shop">
              <ArrowLeft className="h-4 w-4" />
              Back to workspace
            </Link>
          </Button>
          <div>
            <Badge variant="outline">ORDER</Badge>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{order?.orderNumber ?? "Order detail"}</h1>
            <p className="mt-1 text-sm text-slate-600">Review order items and collect payment.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void Promise.all([orderQuery.refetch(), paymentsQuery.refetch()])}>
            Refresh
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Payment
          </Button>
        </div>
      </div>

      {feedback ? (
        <Alert variant={feedback.kind === "error" ? "destructive" : "success"}>{feedback.message}</Alert>
      ) : null}
      {loading ? <p className="text-sm text-slate-500">Loading order detail...</p> : null}
      {isError ? (
        <Button type="button" variant="outline" onClick={() => void Promise.all([orderQuery.refetch(), paymentsQuery.refetch()])}>
          Retry loading data
        </Button>
      ) : null}

      {order ? (
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Overview</h2>
            <Badge variant={order.status === "PAID" ? "secondary" : "outline"}>{order.status}</Badge>
          </div>
          <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <span className="font-medium text-slate-950">Customer</span>
              <div>{order.customerId}</div>
            </div>
            <div>
              <span className="font-medium text-slate-950">Shop item total</span>
              <div>${shopOrderTotal(order)}</div>
            </div>
            <div>
              <span className="font-medium text-slate-950">Created</span>
              <div>{new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <span className="font-medium text-slate-950">Updated</span>
              <div>{new Date(order.updatedAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      ) : null}

      <ApiTable title="Items" headers={["SKU", "Product", "Shop", "Price", "Quantity"]}>
        {order?.items?.length ? null : <EmptyRow colSpan={5} label="No items returned." />}
        {order?.items?.map((item: OrderItemResponseVo) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.skuId}</TableCell>
            <TableCell>
              <Link href={`/shop/products/${item.productId}`} className="text-sm text-slate-700 underline-offset-2 hover:underline">
                {item.productId}
              </Link>
            </TableCell>
            <TableCell>{item.shopId}</TableCell>
            <TableCell>${item.price}</TableCell>
            <TableCell>{item.quantity}</TableCell>
          </TableRow>
        ))}
      </ApiTable>

      <ApiTable title="Payments" headers={["Payment", "Method", "Status", "Amount"]}>
        {paymentsQuery.data?.length ? null : <EmptyRow colSpan={4} label="No payments returned." />}
        {paymentsQuery.data?.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-medium">{payment.id}</TableCell>
            <TableCell>{payment.method}</TableCell>
            <TableCell>
              <Badge
                variant={payment.status === "SUCCESS" ? "secondary" : payment.status === "FAILED" ? "destructive" : "outline"}
              >
                {payment.status}
              </Badge>
            </TableCell>
            <TableCell>${payment.amount}</TableCell>
          </TableRow>
        ))}
      </ApiTable>

      <PaymentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        saving={submitMutation.isPending}
        submit={handleSubmit}
        defaultOrderId={orderId}
      />
    </main>
  );
}
