const ACCESS_TOKEN_KEY = "shopAccessToken";
const ACCESS_TOKEN_EXPIRES_KEY = "shopAccessTokenExpires";
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const expiresAtRaw = localStorage.getItem(ACCESS_TOKEN_EXPIRES_KEY);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0;

  if (expiresAtRaw && !Number.isFinite(expiresAt)) {
    clearAccessToken();
    return null;
  }

  if (expiresAt > 0 && Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    clearAccessToken();
    return null;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string, expiresAt?: number): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  if (expiresAt) {
    localStorage.setItem(ACCESS_TOKEN_EXPIRES_KEY, String(expiresAt));
  } else {
    localStorage.removeItem(ACCESS_TOKEN_EXPIRES_KEY);
  }
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_KEY);
}
