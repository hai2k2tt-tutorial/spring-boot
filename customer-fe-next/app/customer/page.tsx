"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { ApiDialogs } from "@/components/api-workspace/dialogs";
import { DialogName } from "@/components/api-workspace/dialogs";
import { ApiTable, EmptyRow } from "@/components/api-workspace/primitives";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { fetchCustomers, fetchOrders, fetchPayments, fetchProducts } from "@/lib/api";

type CustomerWorkspaceData = {
  products: Awaited<ReturnType<typeof fetchProducts>>;
  customers: Awaited<ReturnType<typeof fetchCustomers>>;
  orders: Awaited<ReturnType<typeof fetchOrders>>;
  payments: Awaited<ReturnType<typeof fetchPayments>>;
};

const emptyCustomerWorkspaceData: CustomerWorkspaceData = {
  products: [],
  customers: [],
  orders: [],
  payments: [],
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function CustomerPage() {
  const { data: session, status } = useSession();
  const accessToken = session?.accessToken;
  const [dialog, setDialog] = useState<DialogName>(null);
  const queryClient = useQueryClient();

  const workspaceQuery = useQuery({
    queryKey: ["customer-workspace", accessToken ? "authenticated" : "anonymous"],
    queryFn: async (): Promise<CustomerWorkspaceData> => {
      const [products, customers, orders, payments] = await Promise.all([
        fetchProducts(accessToken),
        fetchCustomers(accessToken),
        fetchOrders(undefined, accessToken),
        fetchPayments(undefined, accessToken),
      ]);
      return { products, customers, orders, payments };
    },
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });

  const workspaceMutation = useMutation({
    mutationFn: async (work: (token?: string) => Promise<unknown>) => work(accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customer-workspace"] });
      setDialog(null);
    },
  });

  const { products, customers, orders, payments } = workspaceQuery.data ?? emptyCustomerWorkspaceData;
  const feedback = workspaceMutation.error
    ? { kind: "error" as const, message: getErrorMessage(workspaceMutation.error, "API request failed") }
    : workspaceMutation.isSuccess
      ? { kind: "success" as const, message: "API request completed successfully." }
      : workspaceQuery.error
        ? { kind: "error" as const, message: getErrorMessage(workspaceQuery.error, "Unable to load customer data") }
        : null;

  async function submit(work: (token?: string) => Promise<unknown>) {
    await workspaceMutation.mutateAsync(work);
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><Badge variant="outline">CUSTOMER API UI</Badge><h1 className="mt-3 text-3xl font-semibold text-slate-950">Customer workspace</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">Customer-token workspace for catalog browsing, orders, payments, and wallet profile data.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void workspaceQuery.refetch()} disabled={workspaceQuery.isFetching}>Refresh</Button><Button onClick={() => setDialog("order")}><Plus className="h-4 w-4" />Order</Button><Button variant="secondary" onClick={() => setDialog("payment")}>Payment</Button></div>
      </div>
      {feedback ? <Alert variant={feedback.kind === "error" ? "destructive" : "success"}>{feedback.message}</Alert> : null}
      {status === "loading" || workspaceQuery.isLoading ? <p className="text-sm text-slate-500">Loading customer data...</p> : null}
      {workspaceQuery.isError ? <Button type="button" variant="outline" onClick={() => void workspaceQuery.refetch()}>Retry loading data</Button> : null}

      <ApiTable title="Catalog" headers={["Product", "Price", "Status", "Category"]}>
        {products.length === 0 ? <EmptyRow colSpan={4} label="No products returned." /> : null}
        {products.map((product) => <TableRow key={product.id ?? product.name}><TableCell><p className="font-medium">{product.name}</p><p className="text-xs text-slate-500">{product.description}</p></TableCell><TableCell>${product.price}</TableCell><TableCell><Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status ?? "N/A"}</Badge></TableCell><TableCell>{product.categoryId ?? "-"}</TableCell></TableRow>)}
      </ApiTable>

      <ApiTable title="Profile / wallet" headers={["Customer", "Email", "Status", "Wallet"]}>
        {customers.length === 0 ? <EmptyRow colSpan={4} label="No customer records returned." /> : null}
        {customers.map((customer) => <TableRow key={customer.customerId}><TableCell className="font-medium">{customer.firstName} {customer.lastName}</TableCell><TableCell>{customer.email}</TableCell><TableCell><Badge variant={customer.status === "ACTIVE" ? "secondary" : "outline"}>{customer.status}</Badge></TableCell><TableCell>{customer.balance} {customer.currency}</TableCell></TableRow>)}
      </ApiTable>

      <ApiTable title="Orders" headers={["Order", "Status", "Total", "Items", "Created"]} action={<Button size="sm" onClick={() => setDialog("order")}>Create order</Button>}>
        {orders.length === 0 ? <EmptyRow colSpan={5} label="No orders returned." /> : null}
        {orders.map((order) => <TableRow key={order.id}><TableCell className="font-medium">{order.orderNumber}</TableCell><TableCell><Badge variant={order.status === "PAID" ? "secondary" : order.status === "CANCELED" ? "destructive" : "outline"}>{order.status}</Badge></TableCell><TableCell>${order.totalAmount}</TableCell><TableCell>{order.items?.length ?? 0}</TableCell><TableCell className="text-slate-500">{new Date(order.createdAt).toLocaleString()}</TableCell></TableRow>)}
      </ApiTable>

      <ApiTable title="Payments" headers={["Payment", "Order", "Method", "Status", "Amount"]} action={<Button size="sm" onClick={() => setDialog("payment")}>Create payment</Button>}>
        {payments.length === 0 ? <EmptyRow colSpan={5} label="No payments returned." /> : null}
        {payments.map((payment) => <TableRow key={payment.id}><TableCell className="font-medium">{payment.id}</TableCell><TableCell>{payment.orderId}</TableCell><TableCell>{payment.method}</TableCell><TableCell><Badge variant={payment.status === "SUCCESS" ? "secondary" : payment.status === "FAILED" ? "destructive" : "outline"}>{payment.status}</Badge></TableCell><TableCell>${payment.amount}</TableCell></TableRow>)}
      </ApiTable>

      <ApiDialogs dialog={dialog} setDialog={setDialog} saving={workspaceMutation.isPending} submit={submit} />
    </main>
  );
}
