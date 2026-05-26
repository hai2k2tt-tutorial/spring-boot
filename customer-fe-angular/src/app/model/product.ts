export interface Product {
  id?: string;
  skuCode?: string;
  shopId?: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  categoryId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}
