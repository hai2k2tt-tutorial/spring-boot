"use client";

import { Plus } from "lucide-react";
import { ApiDialogs } from "@/components/api-workspace/dialogs";
import { ApiTable, EmptyRow } from "@/components/api-workspace/primitives";
import { useWorkspaceAuth } from "@/components/api-workspace/use-workspace-auth";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { updateProduct } from "@/lib/api";

export default function ShopPage() {
  const auth = useWorkspaceAuth("shop");
  const { products, skus, orders, payments } = auth.data;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><Badge variant="outline">SHOP API UI</Badge><h1 className="mt-3 text-3xl font-semibold text-slate-950">Shop workspace</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">Shop-token workspace for catalog, inventory, order follow-up, and payments.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={auth.loadData} disabled={auth.fetching}>Refresh</Button><Button onClick={() => auth.setDialog("product")}><Plus className="h-4 w-4" />Product</Button><Button variant="secondary" onClick={() => auth.setDialog("sku")}>SKU</Button></div>
      </div>
      {auth.feedback ? <Alert variant={auth.feedback.kind === "error" ? "destructive" : "success"}>{auth.feedback.message}</Alert> : null}
      {auth.loading ? <p className="text-sm text-slate-500">Loading shop data...</p> : null}
      {auth.isError ? <Button type="button" variant="outline" onClick={() => void auth.refetch()}>Retry loading data</Button> : null}

      <ApiTable title="Catalog" headers={["Product", "Price", "Status", "Category", "Updated", "Actions"]} action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => auth.setDialog("attribute")}>Attribute</Button><Button size="sm" onClick={() => auth.setDialog("product")}>Create</Button></div>}>
        {products.length === 0 ? <EmptyRow colSpan={6} label="No products returned." /> : null}
        {products.map((product) => <TableRow key={product.id ?? product.name}><TableCell className="font-medium">{product.name}</TableCell><TableCell>${product.price}</TableCell><TableCell><Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status ?? "N/A"}</Badge></TableCell><TableCell>{product.categoryId ?? "-"}</TableCell><TableCell className="text-slate-500">{product.updatedAt ? new Date(product.updatedAt).toLocaleString() : "-"}</TableCell><TableCell><Button size="sm" variant="outline" disabled={!product.id} onClick={() => auth.submit((token) => updateProduct(product.id!, { ...product, status: product.status === "ACTIVE" ? "DRAFT" : "ACTIVE" }, token))}>Toggle</Button></TableCell></TableRow>)}
      </ApiTable>

      <ApiTable title="Inventory" headers={["SKU", "Product", "Price override", "Quantity", "Created", "Actions"]} action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => auth.setDialog("stock")}>Stock check</Button><Button size="sm" onClick={() => auth.setDialog("sku")}>SKU</Button></div>}>
        {skus.length === 0 ? <EmptyRow colSpan={6} label="No SKUs returned." /> : null}
        {skus.map((sku) => <TableRow key={sku.id}><TableCell className="font-medium">{sku.skuCode}</TableCell><TableCell>{sku.productId}</TableCell><TableCell>{sku.priceOverride ?? "-"}</TableCell><TableCell>{sku.quantity}</TableCell><TableCell className="text-slate-500">{new Date(sku.createdAt).toLocaleString()}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => auth.setDialog("stock")}>Check</Button></TableCell></TableRow>)}
      </ApiTable>

      <ApiTable title="Orders" headers={["Order", "Customer", "Status", "Total", "Items", "Created"]} action={<Button size="sm" onClick={() => auth.setDialog("order")}>Create order</Button>}>
        {orders.length === 0 ? <EmptyRow colSpan={6} label="No orders returned." /> : null}
        {orders.map((order) => <TableRow key={order.id}><TableCell className="font-medium">{order.orderNumber}</TableCell><TableCell>{order.customerId}</TableCell><TableCell><Badge variant={order.status === "PAID" ? "secondary" : "outline"}>{order.status}</Badge></TableCell><TableCell>${order.totalAmount}</TableCell><TableCell>{order.items?.length ?? 0}</TableCell><TableCell className="text-slate-500">{new Date(order.createdAt).toLocaleString()}</TableCell></TableRow>)}
      </ApiTable>

      <ApiTable title="Payments" headers={["Payment", "Order", "Method", "Status", "Amount"]}>
        {payments.length === 0 ? <EmptyRow colSpan={5} label="No payments returned." /> : null}
        {payments.map((payment) => <TableRow key={payment.id}><TableCell className="font-medium">{payment.id}</TableCell><TableCell>{payment.orderId}</TableCell><TableCell>{payment.method}</TableCell><TableCell><Badge variant={payment.status === "SUCCESS" ? "secondary" : payment.status === "FAILED" ? "destructive" : "outline"}>{payment.status}</Badge></TableCell><TableCell>${payment.amount}</TableCell></TableRow>)}
      </ApiTable>

      <ApiDialogs dialog={auth.dialog} setDialog={auth.setDialog} saving={auth.saving} submit={auth.submit} requireToken={auth.requireToken} />
    </main>
  );
}
