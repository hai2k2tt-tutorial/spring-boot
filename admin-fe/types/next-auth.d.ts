import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    preferred_username?: string;
    given_name?: string;
    family_name?: string;
  }

  interface Session {
    accessToken?: string;
    accessTokenExpires?: number;
    error?: string;
    user: DefaultSession["user"] & {
      preferred_username?: string;
      given_name?: string;
      family_name?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    idToken?: string;
    preferredUsername?: string;
    givenName?: string;
    familyName?: string;
    error?: string;
  }
}
