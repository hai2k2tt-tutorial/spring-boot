FROM node:22-alpine AS local
WORKDIR /app
RUN cat > /usr/local/bin/local-next-dev <<'EOF' && chmod +x /usr/local/bin/local-next-dev
#!/bin/sh
set -eu

LOCK_HASH="$(sha256sum package-lock.json | cut -d" " -f1)"
if [ ! -d node_modules/.bin ] || [ ! -f node_modules/.package-lock.hash ] || [ "$(cat node_modules/.package-lock.hash)" != "$LOCK_HASH" ]; then
  npm ci --prefer-offline --no-audit --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
  echo "$LOCK_HASH" > node_modules/.package-lock.hash
fi

rm -rf .next/dev .next/server .next/types .next/cache

exec npm run dev -- --hostname 0.0.0.0
EOF
EXPOSE 3002
CMD ["local-next-dev"]

FROM node:22 AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3002
CMD ["npm", "run", "start"]
