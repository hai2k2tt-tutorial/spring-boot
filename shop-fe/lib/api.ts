import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth-token";
import {
  AttributeRequestDto,
  AttributeResponseVo,
  CategoryRequestDto,
  CategoryResponseVo,
  CustomerResponseVo,
  CustomerProfileUpdateRequestDto,
  CustomerStatusUpdateRequestDto,
  CustomerWalletUpdateRequestDto,
  InventoryCheckResponseVo,
  OrderResponseVo,
  PaymentCreateRequestDto,
  PaymentHistoryResponseVo,
  PaymentResponseVo,
  PaymentStatusUpdateRequestDto,
  Product,
  ProductImagePresignResponseVo,
  ProductRequestDto,
  ProductResponseVo,
  ShopResponseVo,
  ShopProfileUpdateRequestDto,
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

type ApiErrorBody = {
  message?: unknown;
  detail?: unknown;
  reason?: unknown;
  error?: unknown;
  title?: unknown;
};

function getResponseErrorMessage(data: unknown): string | undefined {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return undefined;

  const body = data as ApiErrorBody;
  const message = body.message ?? body.detail ?? body.reason ?? body.error ?? body.title;
  return typeof message === "string" && message.trim().length > 0 ? message : undefined;
}

function parseError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseMessage = getResponseErrorMessage(error.response?.data);
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

function toGatewayImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith("/api/gateway/")) return imageUrl;
  if (imageUrl.startsWith("/api/")) return `/api/gateway/${imageUrl.slice("/api/".length)}`;
  return imageUrl;
}

function normalizeProductImageUrl<T extends { imageUrl?: string }>(product: T): T {
  return product.imageUrl ? { ...product, imageUrl: toGatewayImageUrl(product.imageUrl) } : product;
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await api.get<Product[]>("/product");
    return response.data.map(normalizeProductImageUrl);
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchProduct(productId: UUID): Promise<ProductResponseVo> {
  try {
    const response = await api.get<ProductResponseVo>(`/product/${productId}`);
    return normalizeProductImageUrl(response.data);
  } catch (error) {
    throw parseError(error);
  }
}

export async function createProduct(product: ProductRequestDto | Product): Promise<ProductResponseVo> {
  try {
    const response = await api.post<ProductResponseVo>("/product", toProductRequest(product));
    return normalizeProductImageUrl(response.data);
  } catch (error) {
    throw parseError(error);
  }
}

export async function uploadProductImage(file: File): Promise<ProductImagePresignResponseVo> {
  try {
    const response = await api.post<ProductImagePresignResponseVo>("/product/images/presign", {
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    });

    const presigned = {
      ...response.data,
      imageUrl: toGatewayImageUrl(response.data.imageUrl),
    };

    const uploadResponse = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`MinIO upload failed with status ${uploadResponse.status}`);
    }

    return presigned;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateProduct(productId: UUID, product: ProductRequestDto | Product): Promise<ProductResponseVo> {
  try {
    const response = await api.put<ProductResponseVo>("/product", { ...toProductRequest(product), id: productId });
    return normalizeProductImageUrl(response.data);
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

export async function fetchOrder(orderId: UUID): Promise<OrderResponseVo> {
  try {
    const response = await api.get<OrderResponseVo>(`/order/${orderId}`);
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

export async function updateCustomerProfile(
  customerId: UUID,
  profile: CustomerProfileUpdateRequestDto
): Promise<CustomerResponseVo> {
  try {
    const response = await api.patch<CustomerResponseVo>(`/customers/${customerId}/profile`, profile);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchCurrentCustomer(): Promise<CustomerResponseVo> {
  try {
    const response = await api.get<CustomerResponseVo>("/customers/me");
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateCurrentCustomerProfile(profile: CustomerProfileUpdateRequestDto): Promise<CustomerResponseVo> {
  try {
    const response = await api.patch<CustomerResponseVo>("/customers/me/profile", profile);
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

export async function fetchCurrentShop(): Promise<ShopResponseVo> {
  try {
    const response = await api.get<ShopResponseVo>("/shops/me");
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

export async function updateShopProfile(shopId: UUID, profile: ShopProfileUpdateRequestDto): Promise<ShopResponseVo> {
  try {
    const response = await api.patch<ShopResponseVo>(`/shops/${shopId}/profile`, profile);
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateCurrentShopProfile(profile: ShopProfileUpdateRequestDto): Promise<ShopResponseVo> {
  try {
    const response = await api.patch<ShopResponseVo>("/shops/me/profile", profile);
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
