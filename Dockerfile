# ---- Build Stage ----
# Build context harus parent directory yang berisi mailog/ dan sso-login/
#   docker build -f mailog/Dockerfile -t mailog .
FROM node:22-alpine AS builder

WORKDIR /workspace

# Copy kedua repository agar file:../sso-login/... bisa di-resolve oleh pnpm
COPY mailog/ ./mailog/
COPY sso-login/ ./sso-login/

WORKDIR /workspace/mailog

# Install + build Nuxt
RUN corepack enable \
  && pnpm install --production=false --frozen-lockfile --offline=false \
  && pnpm run build \
  && pnpm prune --prod

# ---- Runner Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

# Copy hasil build Nuxt (standalone server)
COPY --from=builder /workspace/mailog/.output ./

# Volume untuk file upload (jika STORAGE_DRIVER=local)
RUN mkdir -p /app/uploads
VOLUME /app/uploads

EXPOSE 3000

# Pastikan pnpm tidak menjadi blocker — Nuxt output sudah standalone
CMD ["node", "server/index.mjs"]
