export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9000/api";

export const authIssuer =
  process.env.AUTH_ISSUER ??
  "http://localhost:8181/realms/ecommerce-customer";

export const authClientId =
  process.env.AUTH_CLIENT_ID ?? "customer-fe-client";

export const authScope =
  process.env.AUTH_SCOPE ?? "openid profile offline_access";
