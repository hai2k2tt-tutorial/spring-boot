export interface PortalProduct {
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  skuCount: number;
  stock: number;
}

export interface PortalOrderItem {
  skuCode: string;
  variant: string;
  quantity: number;
  price: number;
}

export interface PortalOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  shopName: string;
  status: "PENDING" | "PAID" | "CANCELED";
  totalAmount: number;
  createdAt: string;
  items: PortalOrderItem[];
}

export interface ShopSnapshot {
  shopId: string;
  shopName: string;
  ownerName: string;
  status: "ACTIVE" | "LOCKED";
  balance: number;
  currency: string;
  liveProducts: number;
  openOrders: number;
}

export interface CustomerSnapshot {
  customerId: string;
  fullName: string;
  email: string;
  balance: number;
  currency: string;
  activeOrders: number;
  paymentStatus: "Healthy" | "Review";
}

export interface PaymentSnapshot {
  id: string;
  customerName: string;
  amount: number;
  method: "BALANCE" | "CARD" | "MANUAL";
  status: "PENDING" | "SUCCESS" | "FAILED";
  createdAt: string;
}

export interface CustomerDashboardData {
  profile: {
    name: string;
    email: string;
    tier: string;
    balance: number;
    currency: string;
  };
  orders: PortalOrder[];
  payments: PaymentSnapshot[];
  recommendations: PortalProduct[];
}
