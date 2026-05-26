import axios from "axios";
import {
  AttributeRequestDto,
  AttributeResponseVo,
  AttributeValueRequestDto,
  AttributeValueResponseVo,
  CategoryRequestDto,
  CategoryResponseVo,
  CustomerCreateRequestDto,
  CustomerResponseVo,
  CustomerStatusUpdateRequestDto,
  CustomerWalletUpdateRequestDto,
  InventoryCheckResponseVo,
  Order,
  OrderCreateRequestDto,
  OrderResponseVo,
  PaymentCreateRequestDto,
  PaymentHistoryResponseVo,
  PaymentResponseVo,
  PaymentStatusUpdateRequestDto,
  Product,
  ShopCreateRequestDto,
  ShopResponseVo,
  ShopStatusUpdateRequestDto,
  ShopWalletUpdateRequestDto,
  SkuRequestDto,
  SkuResponseVo,
  UUID,
} from "./types";

const api = axios.create({
  baseURL: "/api/gateway",
  headers: {
    "Content-Type": "application/json",
  },
});

function parseError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data === "string"
        ? error.response.data
        : error.response?.data?.message;
    return new Error(responseMessage || error.message || "Request failed");
  }

  return error instanceof Error ? error : new Error("Request failed");
}

export async function fetchProducts(accessToken?: string): Promise<Product[]> {
  try {
    const response = await api.get<Product[]>("/product", {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

function authHeaders(accessToken?: string) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

export async function fetchCategories(accessToken?: string): Promise<CategoryResponseVo[]> {
  try {
    const response = await api.get<CategoryResponseVo[]>("/categories", {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createCategory(category: CategoryRequestDto, accessToken?: string): Promise<CategoryResponseVo> {
  try {
    const response = await api.post<CategoryResponseVo>("/categories", category, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createAttribute(attribute: AttributeRequestDto, accessToken?: string): Promise<AttributeResponseVo> {
  try {
    const response = await api.post<AttributeResponseVo>("/inventory/attributes", attribute, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createAttributeValue(
  attributeId: UUID,
  value: AttributeValueRequestDto,
  accessToken?: string
): Promise<AttributeValueResponseVo> {
  try {
    const response = await api.post<AttributeValueResponseVo>(`/inventory/attributes/${attributeId}/values`, value, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchAttributes(productId: UUID, accessToken?: string): Promise<AttributeResponseVo[]> {
  try {
    const response = await api.get<AttributeResponseVo[]>("/inventory/attributes", {
      params: { productId },
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchAttributeValues(attributeId: UUID, accessToken?: string): Promise<AttributeValueResponseVo[]> {
  try {
    const response = await api.get<AttributeValueResponseVo[]>(`/inventory/attributes/${attributeId}/values`, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createSku(sku: SkuRequestDto, accessToken?: string): Promise<SkuResponseVo> {
  try {
    const response = await api.post<SkuResponseVo>("/inventory/skus", sku, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchSkus(productId: UUID, accessToken?: string): Promise<SkuResponseVo[]> {
  try {
    const response = await api.get<SkuResponseVo[]>("/inventory/skus", {
      params: { productId },
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function checkStock(skuCode: string, quantity: number, accessToken?: string): Promise<InventoryCheckResponseVo> {
  try {
    const response = await api.get<InventoryCheckResponseVo>("/inventory/stock-check", {
      params: { skuCode, quantity },
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function placeOrder(order: OrderCreateRequestDto, accessToken?: string): Promise<OrderResponseVo> {
  try {
    const response = await api.post<OrderResponseVo>("/order", order, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchOrders(customerId?: UUID, accessToken?: string): Promise<OrderResponseVo[]> {
  try {
    const response = await api.get<OrderResponseVo[]>("/order", {
      params: customerId ? { customerId } : undefined,
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function orderProduct(order: Order, accessToken?: string): Promise<OrderResponseVo> {
  try {
    const response = await api.post<OrderResponseVo>("/order", order, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createPayment(payment: PaymentCreateRequestDto, accessToken?: string): Promise<PaymentResponseVo> {
  try {
    const response = await api.post<PaymentResponseVo>("/payments", payment, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updatePaymentStatus(
  paymentId: UUID,
  status: PaymentStatusUpdateRequestDto,
  accessToken?: string
): Promise<PaymentResponseVo> {
  try {
    const response = await api.patch<PaymentResponseVo>(`/payments/${paymentId}/status`, status, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchPayments(filters?: { customerId?: UUID; orderId?: UUID }, accessToken?: string): Promise<PaymentResponseVo[]> {
  try {
    const response = await api.get<PaymentResponseVo[]>("/payments", {
      params: filters,
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchPaymentHistory(paymentId: UUID, accessToken?: string): Promise<PaymentHistoryResponseVo[]> {
  try {
    const response = await api.get<PaymentHistoryResponseVo[]>(`/payments/${paymentId}/history`, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createCustomer(customer: CustomerCreateRequestDto, accessToken?: string): Promise<CustomerResponseVo> {
  try {
    const response = await api.post<CustomerResponseVo>("/customers", customer, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateCustomerStatus(
  customerId: UUID,
  status: CustomerStatusUpdateRequestDto,
  accessToken?: string
): Promise<CustomerResponseVo> {
  try {
    const response = await api.patch<CustomerResponseVo>(`/customers/${customerId}/status`, status, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateCustomerWallet(
  customerId: UUID,
  wallet: CustomerWalletUpdateRequestDto,
  accessToken?: string
): Promise<CustomerResponseVo> {
  try {
    const response = await api.patch<CustomerResponseVo>(`/customers/${customerId}/wallet`, wallet, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchCustomers(accessToken?: string): Promise<CustomerResponseVo[]> {
  try {
    const response = await api.get<CustomerResponseVo[]>("/customers", {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchCustomer(customerId: UUID, accessToken?: string): Promise<CustomerResponseVo> {
  try {
    const response = await api.get<CustomerResponseVo>(`/customers/${customerId}`, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createShop(shop: ShopCreateRequestDto, accessToken?: string): Promise<ShopResponseVo> {
  try {
    const response = await api.post<ShopResponseVo>("/shops", shop, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateShopStatus(
  shopId: UUID,
  status: ShopStatusUpdateRequestDto,
  accessToken?: string
): Promise<ShopResponseVo> {
  try {
    const response = await api.patch<ShopResponseVo>(`/shops/${shopId}/status`, status, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateShopWallet(
  shopId: UUID,
  wallet: ShopWalletUpdateRequestDto,
  accessToken?: string
): Promise<ShopResponseVo> {
  try {
    const response = await api.patch<ShopResponseVo>(`/shops/${shopId}/wallet`, wallet, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchShops(accessToken?: string): Promise<ShopResponseVo[]> {
  try {
    const response = await api.get<ShopResponseVo[]>("/shops", {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchShop(shopId: UUID, accessToken?: string): Promise<ShopResponseVo> {
  try {
    const response = await api.get<ShopResponseVo>(`/shops/${shopId}`, {
      headers: authHeaders(accessToken),
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}
