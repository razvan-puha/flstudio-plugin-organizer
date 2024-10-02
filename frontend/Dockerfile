FROM oven/bun:canary-slim AS builder
WORKDIR /app

COPY package.json bun.lockb ./
COPY . .

RUN bun install --frozen-lockfile

ENV NEXT_TELEMETRY_DISABLED=1
ARG API_URL
ENV NEXT_PUBLIC_API_URL=${API_URL} 
ENV NODE_ENV=production

RUN bun run build 

FROM oven/bun:canary-slim AS runner
WORKDIR /app
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/static ./.next/standalone/.next/static
COPY --from=builder /app/.next/standalone ./.next/standalone
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lockb ./bun.lockb
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# run the app
USER nextjs
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT [ "bun", ".next/standalone/server.js" ]