export interface Product {
  id?: string;
  skuCode: string;
  name: string;
  description: string;
  price: number;
}

export interface UserDetails {
  email: string;
  firstName: string;
  lastName: string;
}

export interface Order {
  id?: number;
  orderNumber?: string;
  skuCode: string;
  price: number;
  quantity: number;
  userDetails: UserDetails;
}
