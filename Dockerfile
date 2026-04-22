# syntax=docker/dockerfile:1
# Build multi-stage para Next.js 16 (output: standalone).
# `better-sqlite3` compila nativo con python3/make/g++; el builder hereda `deps`
# para no perder build tools si algo recompila. `next build --webpack` evita
# fallos frecuentes de Turbopack + NFT trazas en CI/Docker (p. ej. Coolify).
# Persistir la BD SQLite montando un volumen en `/app/data` (ver `VOLUME`).

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# Hereda deps (node_modules + g++/make); no reinstalar node_modules.
FROM deps AS builder
COPY . .
# Más memoria pico al empaquetar; sube límite en Coolify Build si aún mata OOM
ENV NODE_OPTIONS=--max-old-space-size=4096
# Webpack: más estable en Docker que el bundler por defecto (Turbopack) en Next 16
RUN npm run build -- --webpack

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# SQLite: montar `/app/data` como volumen persistente en el host.
VOLUME ["/app/data"]
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
