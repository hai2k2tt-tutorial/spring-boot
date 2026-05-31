import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth-token";
import {
  AttributeRequestDto,
  AttributeResponseVo,
  AttributeValueRequestDto,
  AttributeValueResponseVo,
  CategoryRequestDto,
  CategoryResponseVo,
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
  ProductRequestDto,
  ProductResponseVo,
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

type AuthRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

function applyAuthorizationHeader(config: InternalAxiosRequestConfig, token: string) {
  config.headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

async function resolveAccessToken(): Promise<string | undefined> {
  const storedToken = getAccessToken();
  if (storedToken) return storedToken;

  const session = await getSession();
  if (session?.accessToken) {
    setAccessToken(session.accessToken, session.accessTokenExpires);
    return session.accessToken;
  }

  return undefined;
}

api.interceptors.request.use(async (config) => {
  const token = await resolveAccessToken();
  if (token) {
    applyAuthorizationHeader(config, token);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AuthRequestConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      clearAccessToken();

      const session = await getSession();
      if (session?.accessToken) {
        setAccessToken(session.accessToken, session.accessTokenExpires);
        applyAuthorizationHeader(originalRequest, session.accessToken);
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

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

function toProductRequest(product: ProductRequestDto | Product): ProductRequestDto {
  return {
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    categoryId: product.categoryId,
    status: product.status,
  };
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await api.get<Product[]>("/product");
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createProduct(product: ProductRequestDto | Product): Promise<ProductResponseVo> {
  try {
    const response = await api.post<ProductResponseVo>("/product", toProductRequest(product));
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateProduct(productId: UUID, product: ProductRequestDto | Product): Promise<ProductResponseVo> {
  try {
    const response = await api.put<ProductResponseVo>("/product", { ...toProductRequest(product), id: productId });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchCategories(): Promise<CategoryResponseVo[]> {
  try {
    const response = await api.get<CategoryResponseVo[]>("/categories");
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createCategory(category: CategoryRequestDto): Promise<CategoryResponseVo> {
  try {
    const response = await api.post<CategoryResponseVo>("/categories", category);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createAttribute(attribute: AttributeRequestDto): Promise<AttributeResponseVo> {
  try {
    const response = await api.post<AttributeResponseVo>("/inventory/attributes", attribute);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createAttributeValue(
  attributeId: UUID,
  value: AttributeValueRequestDto
): Promise<AttributeValueResponseVo> {
  try {
    const response = await api.post<AttributeValueResponseVo>(`/inventory/attributes/${attributeId}/values`, value);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchAttributes(productId: UUID): Promise<AttributeResponseVo[]> {
  try {
    const response = await api.get<AttributeResponseVo[]>("/inventory/attributes", {
      params: { productId },
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchAttributeValues(attributeId: UUID): Promise<AttributeValueResponseVo[]> {
  try {
    const response = await api.get<AttributeValueResponseVo[]>(`/inventory/attributes/${attributeId}/values`);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createSku(sku: SkuRequestDto): Promise<SkuResponseVo> {
  try {
    const response = await api.post<SkuResponseVo>("/inventory/skus", sku);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchSkus(productId: UUID): Promise<SkuResponseVo[]> {
  try {
    const response = await api.get<SkuResponseVo[]>("/inventory/skus", {
      params: { productId },
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function checkStock(skuCode: string, quantity: number): Promise<InventoryCheckResponseVo> {
  try {
    const response = await api.get<InventoryCheckResponseVo>("/inventory/stock-check", {
      params: { skuCode, quantity },
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function placeOrder(order: OrderCreateRequestDto): Promise<OrderResponseVo> {
  try {
    const response = await api.post<OrderResponseVo>("/order", order);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchOrders(customerId?: UUID): Promise<OrderResponseVo[]> {
  try {
    const response = await api.get<OrderResponseVo[]>("/order", {
      params: customerId ? { customerId } : undefined,
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function orderProduct(order: Order): Promise<OrderResponseVo> {
  try {
    const response = await api.post<OrderResponseVo>("/order", {
      items: [{ skuCode: order.skuCode, quantity: order.quantity }],
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createPayment(payment: PaymentCreateRequestDto): Promise<PaymentResponseVo> {
  try {
    const response = await api.post<PaymentResponseVo>("/payments", payment);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updatePaymentStatus(
  paymentId: UUID,
  status: PaymentStatusUpdateRequestDto
): Promise<PaymentResponseVo> {
  try {
    const response = await api.patch<PaymentResponseVo>(`/payments/${paymentId}/status`, status);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchPayments(filters?: { customerId?: UUID; orderId?: UUID }): Promise<PaymentResponseVo[]> {
  try {
    const response = await api.get<PaymentResponseVo[]>("/payments", {
      params: filters,
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchPaymentHistory(paymentId: UUID): Promise<PaymentHistoryResponseVo[]> {
  try {
    const response = await api.get<PaymentHistoryResponseVo[]>(`/payments/${paymentId}/history`);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateCustomerStatus(
  customerId: UUID,
  status: CustomerStatusUpdateRequestDto
): Promise<CustomerResponseVo> {
  try {
    const response = await api.patch<CustomerResponseVo>(`/customers/${customerId}/status`, status);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateCustomerWallet(
  customerId: UUID,
  wallet: CustomerWalletUpdateRequestDto
): Promise<CustomerResponseVo> {
  try {
    const response = await api.patch<CustomerResponseVo>(`/customers/${customerId}/wallet`, wallet);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchCustomers(): Promise<CustomerResponseVo[]> {
  try {
    const response = await api.get<CustomerResponseVo[]>("/customers");
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchCustomer(customerId: UUID): Promise<CustomerResponseVo> {
  try {
    const response = await api.get<CustomerResponseVo>(`/customers/${customerId}`);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function syncCurrentShop(): Promise<ShopResponseVo> {
  try {
    const response = await api.post<ShopResponseVo>("/shops/me/sync");
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateShopStatus(
  shopId: UUID,
  status: ShopStatusUpdateRequestDto
): Promise<ShopResponseVo> {
  try {
    const response = await api.patch<ShopResponseVo>(`/shops/${shopId}/status`, status);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateShopWallet(
  shopId: UUID,
  wallet: ShopWalletUpdateRequestDto
): Promise<ShopResponseVo> {
  try {
    const response = await api.patch<ShopResponseVo>(`/shops/${shopId}/wallet`, wallet);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchShops(): Promise<ShopResponseVo[]> {
  try {
    const response = await api.get<ShopResponseVo[]>("/shops");
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchShop(shopId: UUID): Promise<ShopResponseVo> {
  try {
    const response = await api.get<ShopResponseVo>(`/shops/${shopId}`);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}
