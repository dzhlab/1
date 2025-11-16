# docker/api.Dockerfile

# Base stage
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm turbo
WORKDIR /app

# Development stage
FROM base AS development
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
COPY prisma/ ./prisma/
RUN pnpm install --frozen-lockfile
COPY apps/api ./apps/api
RUN pnpm --filter api prisma:generate
EXPOSE 4000
CMD ["pnpm", "--filter", "api", "dev"]

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
COPY prisma/ ./prisma/
RUN pnpm install --frozen-lockfile --prod

# Builder stage
FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
COPY prisma/ ./prisma/
RUN pnpm install --frozen-lockfile
COPY apps/api ./apps/api

# Generate Prisma Client
RUN pnpm --filter api prisma:generate

# Build application
RUN pnpm --filter api build

# Production stage
FROM node:20-alpine AS production
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Copy necessary files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "apps/api/dist/main.js"]
