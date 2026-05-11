import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { JWT } from "next-auth/jwt";

const issuer = process.env.AUTH_ISSUER;
const clientId = process.env.AUTH_CLIENT_ID;
const clientSecret = process.env.AUTH_CLIENT_SECRET;
const scope = process.env.AUTH_SCOPE ?? "openid profile offline_access";

async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!issuer || !clientId || !token.refreshToken) {
    return { ...token, error: "RefreshAccessTokenError" };
  }

  const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      grant_type: "refresh_token",
      refresh_token: String(token.refreshToken),
    }),
  });

  if (!response.ok) {
    return { ...token, error: "RefreshAccessTokenError" };
  }

  const refreshed = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    id_token?: string;
  };

  return {
    ...token,
    accessToken: refreshed.access_token,
    accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    idToken: refreshed.id_token ?? token.idToken,
    error: undefined,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  providers: issuer && clientId
    ? [
        Keycloak({
          issuer,
          clientId,
          clientSecret,
          authorization: {
            params: {
              scope,
            },
          },
          client: {
            token_endpoint_auth_method: clientSecret ? "client_secret_post" : "none",
          },
          profile(profile) {
            return {
              id: String(profile.sub),
              name:
                String(profile.preferred_username ?? "").trim() ||
                String(profile.name ?? "").trim() ||
                null,
              email: (profile.email as string | undefined) ?? null,
              image: null,
            };
          },
        }),
      ]
    : [],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        const nextToken: JWT = {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 60 * 60 * 1000,
          refreshToken: account.refresh_token,
          idToken: account.id_token,
          preferredUsername:
            typeof profile?.preferred_username === "string" ? profile.preferred_username : undefined,
          givenName: typeof profile?.given_name === "string" ? profile.given_name : undefined,
          familyName: typeof profile?.family_name === "string" ? profile.family_name : undefined,
        };
        return nextToken;
      }

      if (token.accessTokenExpires && Date.now() < Number(token.accessTokenExpires) - 60_000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined;
      session.user.preferred_username = token.preferredUsername as string | undefined;
      session.user.given_name = token.givenName as string | undefined;
      session.user.family_name = token.familyName as string | undefined;
      return session;
    },
  },
  trustHost: true,
});
