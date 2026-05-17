export interface StorefrontProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string;
  shopName: string;
  availableStock: number;
}

export interface StorefrontOrder {
  orderNumber: string;
  status: 'PENDING' | 'PAID' | 'CANCELED';
  totalAmount: number;
  createdAt: string;
  itemSummary: string;
}

export interface WalletEntry {
  method: 'BALANCE' | 'CARD' | 'MANUAL';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  createdAt: string;
}
