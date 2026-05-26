"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const emptyAdminWorkspaceData: AdminWorkspaceData = {
  products: [],
  categories: [],
  shops: [],
  customers: [],
  orders: [],
  payments: [],
  skus: [],
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const accessToken = session?.accessToken;
  const [dialog, setDialog] = useState<DialogName>(null);
  const queryClient = useQueryClient();

  const workspaceQuery = useQuery({
    queryKey: ["admin-workspace", accessToken ? "authenticated" : "anonymous"],
    queryFn: async (): Promise<AdminWorkspaceData> => {
      const [shops, customers] = await Promise.all([
        fetchShops(accessToken),
        fetchCustomers(accessToken),
      ]);

      const [products, categories, orders, payments] = await Promise.all([
        fetchProducts(accessToken),
        fetchCategories(accessToken),
        fetchOrders(undefined, accessToken),
        fetchPayments(undefined, accessToken),
      ]);

      const firstProductId = products.find((product) => product.id)?.id;
      const skus = firstProductId ? await fetchSkus(firstProductId, accessToken) : [];

      return { products, categories, shops, customers, orders, payments, skus };
    },
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });

  const workspaceMutation = useMutation({
    mutationFn: async (work: (token?: string) => Promise<unknown>) => work(accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-workspace"] });
      setDialog(null);
    },
  });

  const data = workspaceQuery.data ?? emptyAdminWorkspaceData;
  const { products, shops, customers, payments } = data;
  const feedback = workspaceMutation.error
    ? { kind: "error" as const, message: getErrorMessage(workspaceMutation.error, "API request failed") }
    : workspaceMutation.isSuccess
      ? { kind: "success" as const, message: "API request completed successfully." }
      : workspaceQuery.error
        ? { kind: "error" as const, message: getErrorMessage(workspaceQuery.error, "Unable to load admin data") }
        : null;

  async function submit(work: (token?: string) => Promise<unknown>) {
    await workspaceMutation.mutateAsync(work);
  }

  async function requireToken() {
    return accessToken;
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline">ADMIN API UI</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Admin operations</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Admin-token-only workspace for marketplace catalog, shops, customers, and payment controls.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void workspaceQuery.refetch()} disabled={workspaceQuery.isFetching}>Refresh</Button>
          <Button type="button" variant="secondary" onClick={() => setDialog("shop")}>Shop</Button>
          <Button type="button" variant="secondary" onClick={() => setDialog("customer")}>Customer</Button>
        </div>
      </div>

      {feedback ? <Alert variant={feedback.kind === "error" ? "destructive" : "success"}>{feedback.message}</Alert> : null}
      {status === "loading" || workspaceQuery.isLoading ? <p className="text-sm text-slate-500">Loading admin data...</p> : null}
      {workspaceQuery.isError ? <Button type="button" variant="outline" onClick={() => void workspaceQuery.refetch()}>Retry loading data</Button> : null}

      <ApiMetrics data={data} />

      <ApiTable title="Catalog" headers={["Product", "Price", "Status", "Shop", "Category", "Updated"]} action={<Button size="sm" variant="outline" onClick={() => setDialog("category")}>Category</Button>}>
        {products.length === 0 ? <EmptyRow colSpan={6} label="No products returned." /> : null}
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
        <ApiTable title="Shops" headers={["Shop", "Owner", "Status", "Wallet", "Actions"]} action={<Button size="sm" onClick={() => setDialog("shop")}>Create</Button>}>
          {shops.length === 0 ? <EmptyRow colSpan={5} label="No shops returned." /> : null}
          {shops.map((shop) => (
            <TableRow key={shop.shopId}>
              <TableCell className="font-medium">{shop.shopName}</TableCell><TableCell>{shop.ownerName}</TableCell>
              <TableCell><Badge variant={shop.status === "ACTIVE" ? "secondary" : "outline"}>{shop.status}</Badge></TableCell>
              <TableCell>{shop.balance} {shop.currency}</TableCell>
              <TableCell><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => submit((token) => updateShopStatus(shop.shopId, { status: shop.status === "ACTIVE" ? "LOCKED" : "ACTIVE" }, token))}>Toggle</Button><Button size="sm" variant="outline" onClick={() => submit((token) => updateShopWallet(shop.shopId, { balance: shop.balance, currency: shop.currency }, token))}>Wallet</Button></div></TableCell>
            </TableRow>
          ))}
        </ApiTable>

        <ApiTable title="Customers" headers={["Customer", "Email", "Status", "Wallet", "Actions"]} action={<Button size="sm" onClick={() => setDialog("customer")}>Create</Button>}>
          {customers.length === 0 ? <EmptyRow colSpan={5} label="No customers returned." /> : null}
          {customers.map((customer) => (
            <TableRow key={customer.customerId}>
              <TableCell className="font-medium">{customer.firstName} {customer.lastName}</TableCell><TableCell>{customer.email}</TableCell>
              <TableCell><Badge variant={customer.status === "ACTIVE" ? "secondary" : "outline"}>{customer.status}</Badge></TableCell>
              <TableCell>{customer.balance} {customer.currency}</TableCell>
              <TableCell><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => submit((token) => updateCustomerStatus(customer.customerId, { status: customer.status === "ACTIVE" ? "LOCKED" : "ACTIVE" }, token))}>Toggle</Button><Button size="sm" variant="outline" onClick={() => submit((token) => updateCustomerWallet(customer.customerId, { balance: customer.balance, currency: customer.currency }, token))}>Wallet</Button></div></TableCell>
            </TableRow>
          ))}
        </ApiTable>
      </section>

      <ApiTable title="Payments" headers={["Payment", "Customer", "Order", "Method", "Status", "Amount", "Actions"]} action={<Button size="sm" onClick={() => setDialog("payment")}>Create</Button>}>
        {payments.length === 0 ? <EmptyRow colSpan={7} label="No payments returned." /> : null}
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-medium">{payment.id}</TableCell><TableCell>{payment.customerId}</TableCell><TableCell>{payment.orderId}</TableCell><TableCell>{payment.method}</TableCell>
            <TableCell><Badge variant={payment.status === "SUCCESS" ? "secondary" : payment.status === "FAILED" ? "destructive" : "outline"}>{payment.status}</Badge></TableCell>
            <TableCell>${payment.amount}</TableCell>
            <TableCell><Button size="sm" variant="outline" onClick={() => submit((token) => updatePaymentStatus(payment.id, { status: payment.status === "SUCCESS" ? "FAILED" : "SUCCESS" }, token))}>Toggle</Button></TableCell>
          </TableRow>
        ))}
      </ApiTable>

      <ApiDialogs dialog={dialog} setDialog={setDialog} saving={workspaceMutation.isPending} submit={submit} requireToken={requireToken} />
    </main>
  );
}
