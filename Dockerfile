# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files dulu untuk cache layer
COPY package.json pnpm-lock.yaml ./
COPY packages/ ./packages/

RUN corepack enable \
  && pnpm install --production=false --frozen-lockfile --offline=false

# Copy source
COPY . .

RUN pnpm run build \
  && pnpm prune --prod

# ---- Runner Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

# Copy hasil build Nuxt (standalone server)
COPY --from=builder /app/.output ./

# Volume untuk file upload (jika STORAGE_DRIVER=local)
RUN mkdir -p /app/uploads
VOLUME /app/uploads

EXPOSE 3000

# Pastikan pnpm tidak menjadi blocker — Nuxt output sudah standalone
CMD ["node", "server/index.mjs"]
