import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminCustomers, adminShops, paymentSnapshots, portalOrders, portalProducts } from "@/lib/portal-data";
import { PageHeader } from "@/components/portal-page";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function AdminPage() {
  const metrics = [
    { label: "Shops", value: adminShops.length },
    { label: "Customers", value: adminCustomers.length },
    { label: "Open Orders", value: portalOrders.filter((order) => order.status === "PENDING").length },
    { label: "Pending Payments", value: paymentSnapshots.filter((payment) => payment.status === "PENDING").length },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Admin FE"
        title="Marketplace control room"
        description="Operational overview for shop health, customer accounts, catalog quality, and payment exceptions."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-950">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-950">Shops</h2>
          <div className="grid gap-4">
            {adminShops.map((shop) => (
              <Card key={shop.shopId}>
                <CardContent className="grid gap-4 p-5 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] md:items-center">
                  <div>
                    <p className="font-medium text-slate-950">{shop.shopName}</p>
                    <p className="text-sm text-slate-500">{shop.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                    <Badge variant={shop.status === "ACTIVE" ? "secondary" : "outline"}>{shop.status}</Badge>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Balance</p>
                    <p className="text-sm font-medium text-slate-900">{currency.format(shop.balance)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Live / Open</p>
                    <p className="text-sm font-medium text-slate-900">
                      {shop.liveProducts} products, {shop.openOrders} orders
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-950">Payment exceptions</h2>
          <div className="grid gap-4">
            {paymentSnapshots.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{payment.customerName}</p>
                      <p className="text-sm text-slate-500">{new Date(payment.createdAt).toLocaleString()}</p>
                    </div>
                    <Badge variant={payment.status === "SUCCESS" ? "secondary" : payment.status === "FAILED" ? "destructive" : "outline"}>
                      {payment.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{payment.method}</span>
                    <span className="font-medium text-slate-950">{currency.format(payment.amount)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customers needing review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {adminCustomers.map((customer) => (
              <div key={customer.customerId} className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-950">{customer.fullName}</p>
                  <p className="text-sm text-slate-500">{customer.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant={customer.paymentStatus === "Healthy" ? "secondary" : "outline"}>{customer.paymentStatus}</Badge>
                  <p className="mt-1 text-sm text-slate-500">{currency.format(customer.balance)} wallet</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalog watchlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {portalProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-950">{product.name}</p>
                  <p className="text-sm text-slate-500">{product.category}</p>
                </div>
                <div className="text-right text-sm">
                  <Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status}</Badge>
                  <p className="mt-1 text-slate-500">{product.skuCount} SKUs, {product.stock} stock</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
