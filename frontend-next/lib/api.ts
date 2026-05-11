import axios from "axios";
import { apiBaseUrl } from "./config";
import { Order, Product } from "./types";

const api = axios.create({
  baseURL: apiBaseUrl,
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

export async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await api.get<Product[]>("/product");
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createProduct(product: Product, accessToken?: string): Promise<Product> {
  try {
    const response = await api.post<Product>("/product", product, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function orderProduct(order: Order, accessToken?: string): Promise<string> {
  try {
    const response = await api.post<string>("/order", order, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      responseType: "text",
    });
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}
