"use client";

import { ApiDialogs } from "@/components/api-workspace/dialogs";
import { ApiMetrics } from "@/components/api-workspace/tables";
import { ApiTable, EmptyRow } from "@/components/api-workspace/primitives";
import { useWorkspaceAuth } from "@/components/api-workspace/use-workspace-auth";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { updateCustomerStatus, updateCustomerWallet, updatePaymentStatus, updateShopStatus, updateShopWallet } from "@/lib/api";

export default function AdminPage() {
  const auth = useWorkspaceAuth("admin");
  const { products, shops, customers, payments } = auth.data;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline">ADMIN API UI</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Admin operations</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Admin-token-only workspace for marketplace catalog, shops, customers, and payment controls.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={auth.loadData} disabled={auth.fetching}>Refresh</Button>
          <Button type="button" variant="secondary" onClick={() => auth.setDialog("shop")}>Shop</Button>
          <Button type="button" variant="secondary" onClick={() => auth.setDialog("customer")}>Customer</Button>
        </div>
      </div>

      {auth.feedback ? <Alert variant={auth.feedback.kind === "error" ? "destructive" : "success"}>{auth.feedback.message}</Alert> : null}
      {auth.loading ? <p className="text-sm text-slate-500">Loading admin data...</p> : null}
      {auth.isError ? <Button type="button" variant="outline" onClick={() => void auth.refetch()}>Retry loading data</Button> : null}

      <ApiMetrics data={auth.data} />

      <ApiTable title="Catalog" headers={["Product", "Price", "Status", "Shop", "Category", "Updated"]} action={<Button size="sm" variant="outline" onClick={() => auth.setDialog("category")}>Category</Button>}>
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
        <ApiTable title="Shops" headers={["Shop", "Owner", "Status", "Wallet", "Actions"]} action={<Button size="sm" onClick={() => auth.setDialog("shop")}>Create</Button>}>
          {shops.length === 0 ? <EmptyRow colSpan={5} label="No shops returned." /> : null}
          {shops.map((shop) => (
            <TableRow key={shop.shopId}>
              <TableCell className="font-medium">{shop.shopName}</TableCell><TableCell>{shop.ownerName}</TableCell>
              <TableCell><Badge variant={shop.status === "ACTIVE" ? "secondary" : "outline"}>{shop.status}</Badge></TableCell>
              <TableCell>{shop.balance} {shop.currency}</TableCell>
              <TableCell><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => auth.submit((token) => updateShopStatus(shop.shopId, { status: shop.status === "ACTIVE" ? "LOCKED" : "ACTIVE" }, token))}>Toggle</Button><Button size="sm" variant="outline" onClick={() => auth.submit((token) => updateShopWallet(shop.shopId, { balance: shop.balance, currency: shop.currency }, token))}>Wallet</Button></div></TableCell>
            </TableRow>
          ))}
        </ApiTable>

        <ApiTable title="Customers" headers={["Customer", "Email", "Status", "Wallet", "Actions"]} action={<Button size="sm" onClick={() => auth.setDialog("customer")}>Create</Button>}>
          {customers.length === 0 ? <EmptyRow colSpan={5} label="No customers returned." /> : null}
          {customers.map((customer) => (
            <TableRow key={customer.customerId}>
              <TableCell className="font-medium">{customer.firstName} {customer.lastName}</TableCell><TableCell>{customer.email}</TableCell>
              <TableCell><Badge variant={customer.status === "ACTIVE" ? "secondary" : "outline"}>{customer.status}</Badge></TableCell>
              <TableCell>{customer.balance} {customer.currency}</TableCell>
              <TableCell><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => auth.submit((token) => updateCustomerStatus(customer.customerId, { status: customer.status === "ACTIVE" ? "LOCKED" : "ACTIVE" }, token))}>Toggle</Button><Button size="sm" variant="outline" onClick={() => auth.submit((token) => updateCustomerWallet(customer.customerId, { balance: customer.balance, currency: customer.currency }, token))}>Wallet</Button></div></TableCell>
            </TableRow>
          ))}
        </ApiTable>
      </section>

      <ApiTable title="Payments" headers={["Payment", "Customer", "Order", "Method", "Status", "Amount", "Actions"]} action={<Button size="sm" onClick={() => auth.setDialog("payment")}>Create</Button>}>
        {payments.length === 0 ? <EmptyRow colSpan={7} label="No payments returned." /> : null}
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-medium">{payment.id}</TableCell><TableCell>{payment.customerId}</TableCell><TableCell>{payment.orderId}</TableCell><TableCell>{payment.method}</TableCell>
            <TableCell><Badge variant={payment.status === "SUCCESS" ? "secondary" : payment.status === "FAILED" ? "destructive" : "outline"}>{payment.status}</Badge></TableCell>
            <TableCell>${payment.amount}</TableCell>
            <TableCell><Button size="sm" variant="outline" onClick={() => auth.submit((token) => updatePaymentStatus(payment.id, { status: payment.status === "SUCCESS" ? "FAILED" : "SUCCESS" }, token))}>Toggle</Button></TableCell>
          </TableRow>
        ))}
      </ApiTable>

      <ApiDialogs dialog={auth.dialog} setDialog={auth.setDialog} saving={auth.saving} submit={auth.submit} requireToken={auth.requireToken} />
    </main>
  );
}
