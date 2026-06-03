FROM node:22-alpine AS local
WORKDIR /app
RUN cat > /usr/local/bin/local-angular-dev <<'EOF' && chmod +x /usr/local/bin/local-angular-dev
#!/bin/sh
set -eu

LOCK_HASH="$(sha256sum package-lock.json | cut -d" " -f1)"
if [ ! -d node_modules/.bin ] || [ ! -f node_modules/.package-lock.hash ] || [ "$(cat node_modules/.package-lock.hash)" != "$LOCK_HASH" ]; then
  npm ci --prefer-offline --no-audit --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
  echo "$LOCK_HASH" > node_modules/.package-lock.hash
fi

exec npm run start -- --host 0.0.0.0
EOF
EXPOSE 4201
CMD ["local-angular-dev"]

FROM node:22 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
