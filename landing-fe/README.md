# Landing FE

Standalone Next.js landing page for routing users to the ecommerce platform frontends.

## Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs on `http://localhost:3005`.

## Target URLs

Configure where the landing page forwards users with:

- `NEXT_PUBLIC_ADMIN_FE_URL`
- `NEXT_PUBLIC_SHOP_FE_URL`
- `NEXT_PUBLIC_CUSTOMER_FE_URL`
- `NEXT_PUBLIC_CUSTOMER_WALLET_FE_URL`
- `NEXT_PUBLIC_SHOP_WALLET_FE_URL`

Local example values are committed in `.env.example`. Deployments must provide environment-specific values through Helm values or Kubernetes config.

- Admin: `http://localhost:3002`
- Shop: `http://localhost:3003`
- Customer: `http://localhost:3004`
- Customer wallet: `http://localhost:3006`
- Shop wallet: `http://localhost:3007`
