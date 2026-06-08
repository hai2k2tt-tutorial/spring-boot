"use client";

import { ApiDialogs } from "@/components/api-workspace/dialogs";
import Link from "next/link";
import { ApiTable, EmptyRow } from "@/components/api-workspace/primitives";
import { useWorkspaceAuth } from "@/components/api-workspace/use-workspace-auth";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import { updateProduct } from "@/lib/api";
import { CustomerResponseVo, OrderResponseVo, UUID } from "@/lib/types";

function shopOrderTotal(order?: OrderResponseVo) {
  return order?.items?.reduce((total, item) => total + Number(item.price) * item.quantity, 0) ?? 0;
}

function customerDisplayName(customer?: CustomerResponseVo, customerId?: UUID) {
  const fullName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (customer?.email) return customer.email;
  return customerId ? `Customer ${customerId.slice(0, 8)}` : "Customer";
}

export default function ShopDashboardPage() {
  const auth = useWorkspaceAuth("shop");
  const { products, orders, payments, shopWallet, customers } = auth.data;
  const customersByOrderId = new Map<UUID, CustomerResponseVo>(
    customers.flatMap((customer) => [
      [customer.customerId, customer],
      [customer.authId, customer],
    ])
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><Badge variant="outline">SHOP API UI</Badge><h1 className="mt-3 text-3xl font-semibold text-slate-950">Shop workspace</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">Shop-token workspace for catalog, orders, and payments.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={auth.loadData} disabled={auth.fetching}>Refresh</Button></div>
      </div>
      {auth.feedback ? <Alert variant={auth.feedback.kind === "error" ? "destructive" : "success"}>{auth.feedback.message}</Alert> : null}
      {auth.loading ? <p className="text-sm text-slate-500">Loading shop data...</p> : null}
      {auth.isError ? <Button type="button" variant="outline" onClick={() => void auth.refetch()}>Retry loading data</Button> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Shop balance</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-slate-950">{shopWallet ? `${shopWallet.balance} ${shopWallet.currency}` : "-"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Products</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-slate-950">{products.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Shop orders</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-slate-950">{orders.length}</p></CardContent>
        </Card>
      </div>

      <ApiTable title="Catalog" headers={["Product", "Price", "Status", "Category", "Updated", "Actions"]} action={<Button size="sm" onClick={() => auth.setDialog("product")}>Create</Button>}>
        {products.length === 0 ? <EmptyRow colSpan={6} label="No products returned." /> : null}
        {products.map((product) => <TableRow key={product.id ?? product.name}><TableCell className="font-medium">{product.name}</TableCell><TableCell>${product.price}</TableCell><TableCell><Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status ?? "N/A"}</Badge></TableCell><TableCell>{product.categoryName ?? product.categoryId ?? "-"}</TableCell><TableCell className="text-slate-500">{product.updatedAt ? new Date(product.updatedAt).toLocaleString() : "-"}</TableCell><TableCell><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" asChild disabled={!product.id}><Link href={product.id ? `/shop/products/${product.id}` : "#"}>Details</Link></Button><Button size="sm" variant="outline" disabled={!product.id} onClick={() => auth.submit(() => updateProduct(product.id!, { ...product, status: product.status === "ACTIVE" ? "DRAFT" : "ACTIVE" }))}>Toggle</Button></div></TableCell></TableRow>)}
      </ApiTable>

      <ApiTable title="Orders" headers={["Order", "Customer", "Status", "Total", "Items", "Created", "Actions"]}>
        {orders.length === 0 ? <EmptyRow colSpan={7} label="No orders returned." /> : null}
        {orders.map((order) => {
          const customer = customersByOrderId.get(order.customerId);
          return <TableRow key={order.id}><TableCell className="font-medium">{order.orderNumber}</TableCell><TableCell><Link href={`/shop/customers/${order.customerId}`} className="text-slate-700 underline-offset-2 hover:underline">{customerDisplayName(customer, order.customerId)}</Link></TableCell><TableCell><Badge variant={order.status === "PAID" ? "secondary" : "outline"}>{order.status}</Badge></TableCell><TableCell>${shopOrderTotal(order)}</TableCell><TableCell>{order.items?.length ?? 0}</TableCell><TableCell className="text-slate-500">{new Date(order.createdAt).toLocaleString()}</TableCell><TableCell><Button size="sm" variant="outline" asChild><Link href={`/shop/orders/${order.id}`}>View</Link></Button></TableCell></TableRow>;
        })}
      </ApiTable>

      <ApiTable title="Payments" headers={["Payment", "Order", "Method", "Status", "Amount"]}>
        {payments.length === 0 ? <EmptyRow colSpan={5} label="No payments returned." /> : null}
        {payments.map((payment) => {
          const order = orders.find((item) => item.id === payment.orderId);
          return <TableRow key={payment.id}><TableCell className="font-medium">{payment.id}</TableCell><TableCell><Link href={`/shop/orders/${payment.orderId}`} className="text-sm text-slate-700 underline-offset-2 hover:underline">{payment.orderId}</Link></TableCell><TableCell>{payment.method}</TableCell><TableCell><Badge variant={payment.status === "SUCCESS" ? "secondary" : payment.status === "FAILED" ? "destructive" : "outline"}>{payment.status}</Badge></TableCell><TableCell>${order ? shopOrderTotal(order) : payment.amount}</TableCell></TableRow>;
        })}
      </ApiTable>

      <ApiDialogs dialog={auth.dialog} setDialog={auth.setDialog} saving={auth.saving} submit={auth.submit} />
    </main>
  );
}
