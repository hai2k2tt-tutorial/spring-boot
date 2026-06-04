import {
  CustomerDashboardData,
  CustomerSnapshot,
  PaymentSnapshot,
  PortalOrder,
  PortalProduct,
  ShopSnapshot,
} from "@/lib/portal-types";

export const portalProducts: PortalProduct[] = [
  {
    id: "prod-1",
    shopId: "shop-1",
    name: "Meridian Trail Shell",
    description: "Weatherproof commuter shell with removable liner and reflective trim.",
    price: 129,
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    category: "Outerwear",
    status: "ACTIVE",
    skuCount: 6,
    stock: 84,
  },
  {
    id: "prod-2",
    shopId: "shop-1",
    name: "Northline Daypack",
    description: "28L backpack with laptop sleeve, bottle pockets, and modular straps.",
    price: 96,
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    category: "Bags",
    status: "ACTIVE",
    skuCount: 4,
    stock: 53,
  },
  {
    id: "prod-3",
    shopId: "shop-2",
    name: "Riverstone Ceramic Set",
    description: "Stackable dinnerware bundle for four with matte glaze finish.",
    price: 74,
    imageUrl: "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=900&q=80",
    category: "Home",
    status: "DRAFT",
    skuCount: 2,
    stock: 11,
  },
  {
    id: "prod-4",
    shopId: "shop-2",
    name: "Altitude Knit Runner",
    description: "Lightweight knit sneaker with dual-density sole and neutral palette.",
    price: 142,
    imageUrl: "https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=900&q=80",
    category: "Footwear",
    status: "ACTIVE",
    skuCount: 8,
    stock: 67,
  },
];

export const adminShops: ShopSnapshot[] = [
  {
    shopId: "shop-1",
    shopName: "Northline Goods",
    ownerName: "Ivy Carter",
    status: "ACTIVE",
    balance: 18240,
    currency: "USD",
    liveProducts: 18,
    openOrders: 12,
  },
  {
    shopId: "shop-2",
    shopName: "House Meridian",
    ownerName: "Marcus Lee",
    status: "ACTIVE",
    balance: 9340,
    currency: "USD",
    liveProducts: 9,
    openOrders: 4,
  },
  {
    shopId: "shop-3",
    shopName: "Pine Harbor Studio",
    ownerName: "Nora Patel",
    status: "LOCKED",
    balance: 420,
    currency: "USD",
    liveProducts: 2,
    openOrders: 0,
  },
];

export const adminCustomers: CustomerSnapshot[] = [
  {
    customerId: "cust-1",
    fullName: "Ava Johnson",
    email: "ava@example.com",
    balance: 320,
    currency: "USD",
    activeOrders: 2,
    paymentStatus: "Healthy",
  },
  {
    customerId: "cust-2",
    fullName: "Noah Kim",
    email: "noah@example.com",
    balance: 48,
    currency: "USD",
    activeOrders: 1,
    paymentStatus: "Review",
  },
  {
    customerId: "cust-3",
    fullName: "Sophia Brown",
    email: "sophia@example.com",
    balance: 510,
    currency: "USD",
    activeOrders: 0,
    paymentStatus: "Healthy",
  },
];

export const portalOrders: PortalOrder[] = [
  {
    id: "ord-1",
    orderNumber: "ORD-240901",
    customerName: "Ava Johnson",
    shopName: "Northline Goods",
    status: "PENDING",
    totalAmount: 258,
    createdAt: "2026-05-16T10:14:00Z",
    items: [
      { skuCode: "NLG-SHELL-M-BLK", variant: "Black / M", quantity: 1, price: 129 },
      { skuCode: "NLG-SHELL-L-BLK", variant: "Black / L", quantity: 1, price: 129 },
    ],
  },
  {
    id: "ord-2",
    orderNumber: "ORD-240902",
    customerName: "Noah Kim",
    shopName: "House Meridian",
    status: "PAID",
    totalAmount: 74,
    createdAt: "2026-05-15T07:46:00Z",
    items: [{ skuCode: "HM-CERAMIC-SET", variant: "Bundle", quantity: 1, price: 74 }],
  },
  {
    id: "ord-3",
    orderNumber: "ORD-240903",
    customerName: "Sophia Brown",
    shopName: "Northline Goods",
    status: "CANCELED",
    totalAmount: 96,
    createdAt: "2026-05-14T14:30:00Z",
    items: [{ skuCode: "NLG-DAYPACK-GRY", variant: "Grey", quantity: 1, price: 96 }],
  },
];

export const paymentSnapshots: PaymentSnapshot[] = [
  { id: "pay-1", customerName: "Ava Johnson", amount: 258, method: "CARD", status: "PENDING", createdAt: "2026-05-16T10:15:00Z" },
  { id: "pay-2", customerName: "Noah Kim", amount: 74, method: "BALANCE", status: "SUCCESS", createdAt: "2026-05-15T07:48:00Z" },
  { id: "pay-3", customerName: "Sophia Brown", amount: 96, method: "MANUAL", status: "FAILED", createdAt: "2026-05-14T14:31:00Z" },
];

export const customerDashboardData: CustomerDashboardData = {
  profile: {
    name: "Ava Johnson",
    email: "ava@example.com",
    tier: "Gold",
    balance: 320,
    currency: "USD",
  },
  orders: portalOrders.filter((order) => order.customerName === "Ava Johnson"),
  payments: paymentSnapshots.filter((payment) => payment.customerName === "Ava Johnson"),
  recommendations: portalProducts.filter((product) => product.status === "ACTIVE"),
};
