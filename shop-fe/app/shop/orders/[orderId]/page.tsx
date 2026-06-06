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
import { fetchCurrentShop, fetchCurrentShopOrder, fetchCustomer, fetchPayments, fetchProduct } from "@/lib/api";
import { CustomerResponseVo, OrderItemResponseVo, OrderResponseVo, ProductResponseVo, ShopResponseVo, UUID } from "@/lib/types";

type Feedback = { kind: "success" | "error"; message: string } | null;

type OrderDetailPageProps = {
  params: Promise<{ orderId: string }>;
};

type OrderDetailCatalog = {
  customer?: CustomerResponseVo;
  products: Record<UUID, ProductResponseVo>;
  shop?: ShopResponseVo;
  failedLookups: number;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function uniqueIds(ids: UUID[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function formatMoney(value: number | string | undefined) {
  const amount = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "-";
}

function normalizeStatus(status: string) {
  return status.replaceAll("_", " ");
}

function customerDisplayName(customer?: CustomerResponseVo, customerId?: UUID) {
  const fullName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (customer?.email) return customer.email;
  return customerId ? `Customer ${customerId.slice(0, 8)}` : "Customer";
}

function shopOrderTotal(order?: { items?: OrderItemResponseVo[] }) {
  return order?.items?.reduce((total, item) => total + Number(item.price) * item.quantity, 0) ?? 0;
}

async function fetchOrderDetailCatalog(order: OrderResponseVo): Promise<OrderDetailCatalog> {
  const productIds = uniqueIds((order.items ?? []).map((item) => item.productId));

  const [customerResult, productResults, shopResult] = await Promise.all([
    fetchCustomer(order.customerId)
      .then((customer) => ({ status: "fulfilled" as const, value: customer }))
      .catch((reason) => ({ status: "rejected" as const, reason })),
    Promise.allSettled(productIds.map(async (productId) => [productId, await fetchProduct(productId)] as const)),
    fetchCurrentShop()
      .then((shop) => ({ status: "fulfilled" as const, value: shop }))
      .catch((reason) => ({ status: "rejected" as const, reason })),
  ]);

  const products: Record<UUID, ProductResponseVo> = {};
  let failedLookups = 0;

  if (customerResult.status === "rejected") failedLookups += 1;
  if (shopResult.status === "rejected") failedLookups += 1;

  for (const result of productResults) {
    if (result.status === "fulfilled") {
      const [productId, product] = result.value;
      products[productId] = product;
    } else {
      failedLookups += 1;
    }
  }

  return {
    customer: customerResult.status === "fulfilled" ? customerResult.value : undefined,
    products,
    shop: shopResult.status === "fulfilled" ? shopResult.value : undefined,
    failedLookups,
  };
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

  const order = orderQuery.data;

  const catalogQuery = useQuery({
    queryKey: [
      "shop-order-detail-catalog",
      order?.id,
      order?.customerId,
      order?.items?.map((item) => item.productId).sort().join("|"),
    ],
    queryFn: () => fetchOrderDetailCatalog(order as OrderResponseVo),
    enabled: Boolean(order),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const submitMutation = useMutation({
    mutationFn: async (work: () => Promise<unknown>) => work(),
    onSuccess: async () => {
      setFeedback({ kind: "success", message: "Payment created." });
      await Promise.allSettled([orderQuery.refetch(), paymentsQuery.refetch(), catalogQuery.refetch()]);
      setDialogOpen(false);
    },
    onError: (error) => {
      setFeedback({ kind: "error", message: getErrorMessage(error, "API request failed") });
    },
  });

  const loading = orderQuery.isLoading || paymentsQuery.isLoading;
  const isError = orderQuery.isError || paymentsQuery.isError;
  const catalog = catalogQuery.data;
  const customerName = customerDisplayName(catalog?.customer, order?.customerId);
  const shopName = catalog?.shop?.shopName ?? (order?.items?.[0]?.shopId ? `Shop ${order.items[0].shopId.slice(0, 8)}` : "Shop");

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
            <p className="mt-1 text-sm text-slate-600">Review customer, shop, product, SKU, and payment details.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void Promise.all([orderQuery.refetch(), paymentsQuery.refetch(), catalogQuery.refetch()])}
          >
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
      {catalog?.failedLookups ? (
        <Alert>Some customer, product, or shop display details could not be loaded. IDs are shown as fallback.</Alert>
      ) : null}

      {order ? (
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Overview</h2>
            <Badge variant={order.status === "PAID" ? "secondary" : "outline"}>{normalizeStatus(order.status)}</Badge>
          </div>
          <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <span className="font-medium text-slate-950">Customer</span>
              <div>
                <Link href={`/shop/customers/${order.customerId}`} className="text-slate-700 underline-offset-2 hover:underline">
                  {customerName}
                </Link>
              </div>
            </div>
            <div>
              <span className="font-medium text-slate-950">Shop</span>
              <div>{shopName}</div>
            </div>
            <div>
              <span className="font-medium text-slate-950">Shop item total</span>
              <div>{formatMoney(shopOrderTotal(order))}</div>
            </div>
            <div>
              <span className="font-medium text-slate-950">Created</span>
              <div>{formatDate(order.createdAt)}</div>
            </div>
            <div>
              <span className="font-medium text-slate-950">Updated</span>
              <div>{formatDate(order.updatedAt)}</div>
            </div>
          </div>
        </div>
      ) : null}

      <ApiTable title="Items" headers={["SKU code", "Product", "Shop", "Price", "Quantity"]}>
        {order?.items?.length ? null : <EmptyRow colSpan={5} label="No items returned." />}
        {order?.items?.map((item: OrderItemResponseVo) => {
          const product = catalog?.products[item.productId];
          const productName = product?.name ?? `Product ${item.productId.slice(0, 8)}`;
          const itemShopName = catalog?.shop?.shopId === item.shopId ? catalog.shop.shopName : shopName;

          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.skuCode || "SKU code unavailable"}</TableCell>
              <TableCell>
                <Link href={`/shop/products/${item.productId}`} className="text-sm text-slate-700 underline-offset-2 hover:underline">
                  {productName}
                </Link>
              </TableCell>
              <TableCell>{itemShopName}</TableCell>
              <TableCell>{formatMoney(item.price)}</TableCell>
              <TableCell>{item.quantity}</TableCell>
            </TableRow>
          );
        })}
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
            <TableCell>{formatMoney(payment.amount)}</TableCell>
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
