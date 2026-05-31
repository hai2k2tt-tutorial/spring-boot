# Landing FE

Standalone Next.js landing page for routing users to the ecommerce platform frontends.

## Local

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3005`.

## Target URLs

Configure where the landing page forwards users with:

- `NEXT_PUBLIC_ADMIN_FE_URL`
- `NEXT_PUBLIC_SHOP_FE_URL`
- `NEXT_PUBLIC_CUSTOMER_FE_URL`

Defaults:

- Admin: `http://localhost:3002/admin`
- Shop: `http://localhost:3003/shop`
- Customer: `http://localhost:3004/customer`
