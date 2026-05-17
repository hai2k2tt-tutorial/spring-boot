import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, ProductMedia } from "@/components/portal-page";
import { adminShops, portalOrders, portalProducts } from "@/lib/portal-data";

const myShop = adminShops[0];
const products = portalProducts.filter((product) => product.shopId === myShop.shopId);
const orders = portalOrders.filter((order) => order.shopName === myShop.shopName);

export default function ShopPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Shop FE"
        title={myShop.shopName}
        description="Daily operating workspace for catalog publishing, inventory combinations, order follow-up, and wallet balance."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Wallet</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">${myShop.balance.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Live products</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{myShop.liveProducts}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Open orders</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{myShop.openOrders}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Account</CardTitle></CardHeader>
          <CardContent><Badge variant="secondary">{myShop.status}</Badge></CardContent>
        </Card>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Catalog</h2>
            <Button size="sm">Create product draft</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="space-y-4 p-5">
                  <ProductMedia src={product.imageUrl} alt={product.name} />
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{product.name}</p>
                        <p className="text-sm text-slate-500">{product.category}</p>
                      </div>
                      <Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status}</Badge>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{product.description}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400">Price</p>
                      <p className="font-medium text-slate-950">${product.price}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">SKUs</p>
                      <p className="font-medium text-slate-950">{product.skuCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Stock</p>
                      <p className="font-medium text-slate-950">{product.stock}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-950">Recent orders</h2>
          <div className="grid gap-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{order.orderNumber}</p>
                      <p className="text-sm text-slate-500">{order.customerName}</p>
                    </div>
                    <Badge variant={order.status === "PAID" ? "secondary" : order.status === "CANCELED" ? "destructive" : "outline"}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    {order.items.map((item) => (
                      <div key={item.skuCode} className="flex items-center justify-between">
                        <span>{item.variant}</span>
                        <span>{item.quantity} x ${item.price}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
                    <span className="text-slate-500">{new Date(order.createdAt).toLocaleString()}</span>
                    <span className="font-medium text-slate-950">${order.totalAmount}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
