# ---- Build Stage ----
FROM node:22.23.4-alpine AS builder

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
FROM node:22.23.4-alpine AS runner

WORKDIR /app

# wget dipakai Coolify & Docker HEALTHCHECK (alpine default tidak punya curl)
RUN apk add --no-cache wget

# Copy hasil build Nuxt (standalone server)
COPY --from=builder /app/.output ./

# Volume untuk file upload (jika STORAGE_DRIVER=local)
RUN mkdir -p /app/uploads
VOLUME /app/uploads

ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3015
ENV HOST=0.0.0.0
ENV PORT=3015

EXPOSE 3015

# Coolify parse HEALTHCHECK dari Dockerfile (bukan dari docker-compose.yml)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3015/api/health || exit 1

# Pastikan pnpm tidak menjadi blocker — Nuxt output sudah standalone
CMD ["node", "--max-old-space-size=2048", "server/index.mjs"]
