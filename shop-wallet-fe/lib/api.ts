import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth-token";
import { WalletResponseVo, WalletTransactionResponseVo } from "@/lib/types";

const api = axios.create({ baseURL: "/api/gateway", headers: { "Content-Type": "application/json" } });
type AuthRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };
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
export async function fetchWallet(): Promise<WalletResponseVo> { try { const response = await api.get<WalletResponseVo>("/wallet/shop/me"); return response.data; } catch (error) { throw parseError(error); } }
export async function fetchWalletTransactions(): Promise<WalletTransactionResponseVo[]> { try { const response = await api.get<WalletTransactionResponseVo[]>("/wallet/shop/me/transactions"); return response.data; } catch (error) { throw parseError(error); } }
