"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { ApiDialogs } from "@/components/api-workspace/dialogs";
import { DialogName } from "@/components/api-workspace/dialogs";
import { ApiMetrics } from "@/components/api-workspace/tables";
import { ApiTable, EmptyRow } from "@/components/api-workspace/primitives";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  fetchCategories,
  fetchCustomers,
  fetchOrders,
  fetchPayments,
  fetchProducts,
  fetchShops,
  fetchSkus,
  updateCustomerStatus,
  updateCustomerWallet,
  updatePaymentStatus,
  updateShopStatus,
  updateShopWallet,
} from "@/lib/api";

type AdminWorkspaceData = {
  products: Awaited<ReturnType<typeof fetchProducts>>;
  categories: Awaited<ReturnType<typeof fetchCategories>>;
  shops: Awaited<ReturnType<typeof fetchShops>>;
  customers: Awaited<ReturnType<typeof fetchCustomers>>;
  orders: Awaited<ReturnType<typeof fetchOrders>>;
  payments: Awaited<ReturnType<typeof fetchPayments>>;
  skus: Awaited<ReturnType<typeof fetchSkus>>;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function LoadingRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <TableRow><TableCell colSpan={colSpan} className="py-6 text-center text-sm text-slate-500">{label}</TableCell></TableRow>;
}

function ErrorRow({ colSpan, error, onRetry }: { colSpan: number; error: unknown; onRetry: () => void }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-6 text-center">
        <div className="flex flex-col items-center gap-3 text-sm text-red-600">
          <span>{getErrorMessage(error, "Unable to load data")}</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>Retry</Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const authQueryKey = status === "authenticated" ? (session?.user.email ?? "authenticated") : "anonymous";
  const [dialog, setDialog] = useState<DialogName>(null);

  const productsQuery = useQuery({
    queryKey: ["admin-products", authQueryKey],
    queryFn: () => fetchProducts(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });
  const categoriesQuery = useQuery({
    queryKey: ["admin-categories", authQueryKey],
    queryFn: () => fetchCategories(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });
  const shopsQuery = useQuery({
    queryKey: ["admin-shops", authQueryKey],
    queryFn: () => fetchShops(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });
  const customersQuery = useQuery({
    queryKey: ["admin-customers", authQueryKey],
    queryFn: () => fetchCustomers(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });
  const ordersQuery = useQuery({
    queryKey: ["admin-orders", authQueryKey],
    queryFn: () => fetchOrders(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });
  const paymentsQuery = useQuery({
    queryKey: ["admin-payments", authQueryKey],
    queryFn: () => fetchPayments(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });
  const firstProductId = productsQuery.data?.find((product) => product.id)?.id;
  const skusQuery = useQuery({
    queryKey: ["admin-skus", firstProductId, authQueryKey],
    queryFn: () => fetchSkus(firstProductId ?? ""),
    enabled: status !== "loading" && !!firstProductId,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const workspaceMutation = useMutation({
    mutationFn: async (work: () => Promise<unknown>) => work(),
    onSuccess: async () => {
      await refetchWorkspace();
      setDialog(null);
    },
  });

  const data: AdminWorkspaceData = {
    products: productsQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    shops: shopsQuery.data ?? [],
    customers: customersQuery.data ?? [],
    orders: ordersQuery.data ?? [],
    payments: paymentsQuery.data ?? [],
    skus: skusQuery.data ?? [],
  };
  const { products, shops, customers, payments } = data;
  const feedback = workspaceMutation.error
    ? { kind: "error" as const, message: getErrorMessage(workspaceMutation.error, "API request failed") }
    : workspaceMutation.isSuccess
      ? { kind: "success" as const, message: "API request completed successfully." }
      : null;

  async function submit(work: () => Promise<unknown>) {
    await workspaceMutation.mutateAsync(work);
  }

  async function refetchWorkspace() {
    await Promise.allSettled([
      productsQuery.refetch(),
      categoriesQuery.refetch(),
      shopsQuery.refetch(),
      customersQuery.refetch(),
      ordersQuery.refetch(),
      paymentsQuery.refetch(),
      skusQuery.refetch(),
    ]);
  }

  const workspaceIsFetching =
    productsQuery.isFetching ||
    categoriesQuery.isFetching ||
    shopsQuery.isFetching ||
    customersQuery.isFetching ||
    ordersQuery.isFetching ||
    paymentsQuery.isFetching ||
    skusQuery.isFetching;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline">ADMIN API UI</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Admin operations</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Admin-token-only workspace for marketplace catalog, shops, customers, and payment controls.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void refetchWorkspace()} disabled={workspaceIsFetching}>Refresh</Button>
        </div>
      </div>

      {feedback ? <Alert variant={feedback.kind === "error" ? "destructive" : "success"}>{feedback.message}</Alert> : null}
      {status === "loading" ? <p className="text-sm text-slate-500">Loading admin session...</p> : null}

      <ApiMetrics data={data} />

      <ApiTable title="Catalog" headers={["Product", "Price", "Status", "Shop", "Category", "Updated"]} action={<Button size="sm" variant="outline" onClick={() => setDialog("category")}>Category</Button>}>
        {productsQuery.isLoading ? <LoadingRow colSpan={6} label="Loading products..." /> : null}
        {productsQuery.isError ? <ErrorRow colSpan={6} error={productsQuery.error} onRetry={() => void productsQuery.refetch()} /> : null}
        {!productsQuery.isLoading && !productsQuery.isError && products.length === 0 ? <EmptyRow colSpan={6} label="No products returned." /> : null}
        {products.map((product) => (
          <TableRow key={product.id ?? product.name}>
            <TableCell><p className="font-medium">{product.name}</p><p className="text-xs text-slate-500">{product.description}</p></TableCell>
            <TableCell>${product.price}</TableCell>
            <TableCell><Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status ?? "N/A"}</Badge></TableCell>
            <TableCell className="text-slate-600">{product.shopId ?? "-"}</TableCell>
            <TableCell className="text-slate-600">{product.categoryId ?? "-"}</TableCell>
            <TableCell className="text-slate-500">{product.updatedAt ? new Date(product.updatedAt).toLocaleString() : "-"}</TableCell>
          </TableRow>
        ))}
      </ApiTable>

      <section className="grid gap-6 xl:grid-cols-2">
        <ApiTable title="Shops" headers={["Shop", "Owner", "Status", "Wallet", "Actions"]}>
          {shopsQuery.isLoading ? <LoadingRow colSpan={5} label="Loading shops..." /> : null}
          {shopsQuery.isError ? <ErrorRow colSpan={5} error={shopsQuery.error} onRetry={() => void shopsQuery.refetch()} /> : null}
          {!shopsQuery.isLoading && !shopsQuery.isError && shops.length === 0 ? <EmptyRow colSpan={5} label="No shops returned." /> : null}
          {shops.map((shop) => (
            <TableRow key={shop.shopId}>
              <TableCell className="font-medium">{shop.shopName}</TableCell><TableCell>{shop.ownerName}</TableCell>
              <TableCell><Badge variant={shop.status === "ACTIVE" ? "secondary" : "outline"}>{shop.status}</Badge></TableCell>
              <TableCell>{shop.balance} {shop.currency}</TableCell>
              <TableCell><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => submit(() => updateShopStatus(shop.shopId, { status: shop.status === "ACTIVE" ? "LOCKED" : "ACTIVE" }))}>Toggle</Button><Button size="sm" variant="outline" onClick={() => submit(() => updateShopWallet(shop.shopId, { balance: shop.balance, currency: shop.currency }))}>Wallet</Button></div></TableCell>
            </TableRow>
          ))}
        </ApiTable>

        <ApiTable title="Customers" headers={["Customer", "Email", "Status", "Wallet", "Actions"]}>
          {customersQuery.isLoading ? <LoadingRow colSpan={5} label="Loading customers..." /> : null}
          {customersQuery.isError ? <ErrorRow colSpan={5} error={customersQuery.error} onRetry={() => void customersQuery.refetch()} /> : null}
          {!customersQuery.isLoading && !customersQuery.isError && customers.length === 0 ? <EmptyRow colSpan={5} label="No customers returned." /> : null}
          {customers.map((customer) => (
            <TableRow key={customer.customerId}>
              <TableCell className="font-medium">{customer.firstName} {customer.lastName}</TableCell><TableCell>{customer.email}</TableCell>
              <TableCell><Badge variant={customer.status === "ACTIVE" ? "secondary" : "outline"}>{customer.status}</Badge></TableCell>
              <TableCell>{customer.balance} {customer.currency}</TableCell>
              <TableCell><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => submit(() => updateCustomerStatus(customer.customerId, { status: customer.status === "ACTIVE" ? "LOCKED" : "ACTIVE" }))}>Toggle</Button><Button size="sm" variant="outline" onClick={() => submit(() => updateCustomerWallet(customer.customerId, { balance: customer.balance, currency: customer.currency }))}>Wallet</Button></div></TableCell>
            </TableRow>
          ))}
        </ApiTable>
      </section>

      <ApiTable title="Payments" headers={["Payment", "Customer", "Order", "Method", "Status", "Amount", "Actions"]} action={<Button size="sm" onClick={() => setDialog("payment")}>Create</Button>}>
        {paymentsQuery.isLoading ? <LoadingRow colSpan={7} label="Loading payments..." /> : null}
        {paymentsQuery.isError ? <ErrorRow colSpan={7} error={paymentsQuery.error} onRetry={() => void paymentsQuery.refetch()} /> : null}
        {!paymentsQuery.isLoading && !paymentsQuery.isError && payments.length === 0 ? <EmptyRow colSpan={7} label="No payments returned." /> : null}
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-medium">{payment.id}</TableCell><TableCell>{payment.customerId}</TableCell><TableCell>{payment.orderId}</TableCell><TableCell>{payment.method}</TableCell>
            <TableCell><Badge variant={payment.status === "SUCCESS" ? "secondary" : payment.status === "FAILED" ? "destructive" : "outline"}>{payment.status}</Badge></TableCell>
            <TableCell>${payment.amount}</TableCell>
            <TableCell><Button size="sm" variant="outline" onClick={() => submit(() => updatePaymentStatus(payment.id, { status: payment.status === "SUCCESS" ? "FAILED" : "SUCCESS" }))}>Toggle</Button></TableCell>
          </TableRow>
        ))}
      </ApiTable>

      <ApiDialogs dialog={dialog} setDialog={setDialog} saving={workspaceMutation.isPending} submit={submit} />
    </main>
  );
}
