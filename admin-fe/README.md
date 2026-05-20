# admin-fe

Next.js admin frontend.

## Features

- Keycloak login/logout through `next-auth`
- Product list from `GET /api/product`
- Place order with `POST /api/order`
- Add product with `POST /api/product`
- Tailwind + shadcn-style UI primitives
- `react-hook-form` + `zod` validation
- `axios` API client

## Local run

1. Copy `.env.example` to `.env.local` if you need different URLs.
2. Install dependencies with `npm install`.
3. Run `npm run dev`.

Default URLs:

- App: `http://localhost:3002`
- API gateway: `http://localhost:9000/api`
- Keycloak: `http://localhost:8181`

Notes:

- `AUTH_SECRET` is required by `next-auth`.
- Leave `AUTH_CLIENT_SECRET` empty when the Keycloak client is public-only.
