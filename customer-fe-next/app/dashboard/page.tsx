"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ApiTable, EmptyRow } from "@/components/api-workspace/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { fetchCustomers, fetchOrders, fetchPayments, fetchProducts } from "@/lib/api";

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

export default function CustomerDashboardPage() {
  const { data: session, status } = useSession();
  const authQueryKey = status === "authenticated" ? (session?.user.email ?? "authenticated") : "anonymous";

  const productsQuery = useQuery({
    queryKey: ["customer-products", authQueryKey],
    queryFn: () => fetchProducts(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });

  const customersQuery = useQuery({
    queryKey: ["customer-records", authQueryKey],
    queryFn: () => fetchCustomers(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });

  const ordersQuery = useQuery({
    queryKey: ["customer-orders", authQueryKey],
    queryFn: () => fetchOrders(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });

  const paymentsQuery = useQuery({
    queryKey: ["customer-payments", authQueryKey],
    queryFn: () => fetchPayments(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });

  const products = productsQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];

  async function refetchWorkspace() {
    await Promise.allSettled([
      productsQuery.refetch(),
      customersQuery.refetch(),
      ordersQuery.refetch(),
      paymentsQuery.refetch(),
    ]);
  }

  const workspaceIsFetching =
    productsQuery.isFetching ||
    customersQuery.isFetching ||
    ordersQuery.isFetching ||
    paymentsQuery.isFetching;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><Badge variant="outline">CUSTOMER API UI</Badge><h1 className="mt-3 text-3xl font-semibold text-slate-950">Customer workspace</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">Customer-token workspace for catalog browsing, orders, payments, and wallet profile data.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void refetchWorkspace()} disabled={workspaceIsFetching}>Refresh</Button></div>
      </div>
      {status === "loading" ? <p className="text-sm text-slate-500">Loading customer session...</p> : null}

      <ApiTable title="Catalog" headers={["Product", "Price", "Status", "Category", "Actions"]}>
        {productsQuery.isLoading ? <LoadingRow colSpan={5} label="Loading products..." /> : null}
        {productsQuery.isError ? <ErrorRow colSpan={5} error={productsQuery.error} onRetry={() => void productsQuery.refetch()} /> : null}
        {!productsQuery.isLoading && !productsQuery.isError && products.length === 0 ? <EmptyRow colSpan={5} label="No products returned." /> : null}
        {products.map((product) => <TableRow key={product.id ?? product.name}><TableCell><p className="font-medium">{product.name}</p><p className="text-xs text-slate-500">{product.description}</p></TableCell><TableCell>${product.price}</TableCell><TableCell><Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status ?? "N/A"}</Badge></TableCell><TableCell>{product.categoryName ?? product.categoryId ?? "-"}</TableCell><TableCell><Button size="sm" variant="outline" asChild disabled={!product.id}><Link href={product.id ? `/products/${product.id}` : "#"}>Details</Link></Button></TableCell></TableRow>)}
      </ApiTable>

      <ApiTable title="Profile / wallet" headers={["Customer", "Email", "Status", "Wallet"]}>
        {customersQuery.isLoading ? <LoadingRow colSpan={4} label="Loading customers..." /> : null}
        {customersQuery.isError ? <ErrorRow colSpan={4} error={customersQuery.error} onRetry={() => void customersQuery.refetch()} /> : null}
        {!customersQuery.isLoading && !customersQuery.isError && customers.length === 0 ? <EmptyRow colSpan={4} label="No customer records returned." /> : null}
        {customers.map((customer) => <TableRow key={customer.customerId}><TableCell className="font-medium">{customer.firstName} {customer.lastName}</TableCell><TableCell>{customer.email}</TableCell><TableCell><Badge variant={customer.status === "ACTIVE" ? "secondary" : "outline"}>{customer.status}</Badge></TableCell><TableCell>{customer.balance} {customer.currency}</TableCell></TableRow>)}
      </ApiTable>

      <ApiTable title="Orders" headers={["Order", "Status", "Total", "Items", "Created"]}>
        {ordersQuery.isLoading ? <LoadingRow colSpan={5} label="Loading orders..." /> : null}
        {ordersQuery.isError ? <ErrorRow colSpan={5} error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} /> : null}
        {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 ? <EmptyRow colSpan={5} label="No orders returned." /> : null}
        {orders.map((order) => <TableRow key={order.id}><TableCell className="font-medium">{order.orderNumber}</TableCell><TableCell><Badge variant={order.status === "PAID" ? "secondary" : order.status === "CANCELED" ? "destructive" : "outline"}>{order.status}</Badge></TableCell><TableCell>${order.totalAmount}</TableCell><TableCell>{order.items?.length ?? 0}</TableCell><TableCell className="text-slate-500">{new Date(order.createdAt).toLocaleString()}</TableCell></TableRow>)}
      </ApiTable>

      <ApiTable title="Payments" headers={["Payment", "Order", "Method", "Status", "Amount"]}>
        {paymentsQuery.isLoading ? <LoadingRow colSpan={5} label="Loading payments..." /> : null}
        {paymentsQuery.isError ? <ErrorRow colSpan={5} error={paymentsQuery.error} onRetry={() => void paymentsQuery.refetch()} /> : null}
        {!paymentsQuery.isLoading && !paymentsQuery.isError && payments.length === 0 ? <EmptyRow colSpan={5} label="No payments returned." /> : null}
        {payments.map((payment) => <TableRow key={payment.id}><TableCell className="font-medium">{payment.id}</TableCell><TableCell>{payment.orderId}</TableCell><TableCell>{payment.method}</TableCell><TableCell><Badge variant={payment.status === "SUCCESS" ? "secondary" : payment.status === "FAILED" ? "destructive" : "outline"}>{payment.status}</Badge></TableCell><TableCell>${payment.amount}</TableCell></TableRow>)}
      </ApiTable>
    </main>
  );
}
