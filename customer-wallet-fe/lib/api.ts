import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth-token";
import { WalletMoneyRequestDto, WalletResponseVo, WalletTransactionResponseVo } from "@/lib/types";

const api = axios.create({ baseURL: "/api/gateway", headers: { "Content-Type": "application/json" } });
type AuthRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };
let currentCustomerSyncPromise: Promise<void> | null = null;

function applyAuthorizationHeader(config: InternalAxiosRequestConfig, token: string) { config.headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`; }
async function resolveAccessToken(): Promise<string | undefined> {
  const storedToken = getAccessToken();
  if (storedToken) return storedToken;
  const session = await getSession();
  if (session?.accessToken) { setAccessToken(session.accessToken, session.accessTokenExpires); return session.accessToken; }
  return undefined;
}
api.interceptors.request.use(async (config) => { const token = await resolveAccessToken(); if (token) applyAuthorizationHeader(config, token); return config; });
api.interceptors.response.use((response) => response, async (error: AxiosError) => {
  const originalRequest = error.config as AuthRequestConfig | undefined;
  if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
    originalRequest._retry = true; clearAccessToken();
    const session = await getSession();
    if (session?.accessToken) { setAccessToken(session.accessToken, session.accessTokenExpires); applyAuthorizationHeader(originalRequest, session.accessToken); return api(originalRequest); }
  }
  return Promise.reject(error);
});
function parseError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseMessage = typeof error.response?.data === "string" ? error.response.data : error.response?.data?.message;
    return new Error(responseMessage || error.message || "Request failed");
  }
  return error instanceof Error ? error : new Error("Request failed");
}
export async function syncCurrentCustomer(): Promise<void> {
  await api.post("/customers/me/sync");
}

async function ensureCurrentCustomerSynced(): Promise<void> {
  currentCustomerSyncPromise ??= syncCurrentCustomer().catch((error) => {
    currentCustomerSyncPromise = null;
    throw error;
  });
  return currentCustomerSyncPromise;
}

export async function fetchWallet(): Promise<WalletResponseVo> { try { await ensureCurrentCustomerSynced(); const response = await api.get<WalletResponseVo>("/wallet/customer/me"); return response.data; } catch (error) { throw parseError(error); } }
export async function fetchWalletTransactions(): Promise<WalletTransactionResponseVo[]> { try { await ensureCurrentCustomerSynced(); const response = await api.get<WalletTransactionResponseVo[]>("/wallet/customer/me/transactions"); return response.data; } catch (error) { throw parseError(error); } }
export async function depositWallet(deposit: WalletMoneyRequestDto): Promise<WalletResponseVo> { try { await ensureCurrentCustomerSynced(); const response = await api.post<WalletResponseVo>("/wallet/customer/me/deposits", deposit); return response.data; } catch (error) { throw parseError(error); } }
