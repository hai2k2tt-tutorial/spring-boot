const ACCESS_TOKEN_KEY = "customerAccessToken";
const ACCESS_TOKEN_EXPIRES_KEY = "customerAccessTokenExpires";
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const expiresAt = Number(localStorage.getItem(ACCESS_TOKEN_EXPIRES_KEY) ?? 0);
  if (expiresAt && Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
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
