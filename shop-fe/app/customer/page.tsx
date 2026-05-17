import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, ProductMedia } from "@/components/portal-page";
import { customerDashboardData } from "@/lib/portal-data";

export default function CustomerPage() {
  const { profile, orders, payments, recommendations } = customerDashboardData;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Customer FE"
        title={`Welcome back, ${profile.name}`}
        description="Account center for wallet balance, active orders, payment history, and curated recommendations."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Wallet</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">${profile.balance}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Tier</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{profile.tier}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Active orders</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{orders.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Email</CardTitle></CardHeader>
          <CardContent><p className="text-sm font-medium text-slate-950">{profile.email}</p></CardContent>
        </Card>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-950">Order timeline</h2>
          <div className="grid gap-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{order.orderNumber}</p>
                      <p className="text-sm text-slate-500">{order.shopName}</p>
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

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Payment history</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-950">{payment.method}</p>
                    <p className="text-sm text-slate-500">{new Date(payment.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={payment.status === "SUCCESS" ? "secondary" : payment.status === "FAILED" ? "destructive" : "outline"}>
                      {payment.status}
                    </Badge>
                    <p className="mt-1 text-sm font-medium text-slate-950">${payment.amount}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Recommended next</h2>
            <div className="grid gap-4">
              {recommendations.slice(0, 2).map((product) => (
                <Card key={product.id}>
                  <CardContent className="space-y-4 p-5">
                    <ProductMedia src={product.imageUrl} alt={product.name} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{product.name}</p>
                        <p className="text-sm text-slate-500">{product.category}</p>
                      </div>
                      <Badge variant="secondary">${product.price}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
