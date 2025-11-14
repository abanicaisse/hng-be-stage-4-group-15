# Multi-stage Dockerfile for NestJS Microservices
# Optimized for proper native module compilation and minimal image size

# ============================================================================
# Stage 1: Dependencies - Install and build all dependencies
# ============================================================================
FROM node:20-alpine3.17 AS dependencies

# Install build dependencies needed for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++ openssl1.1-compat

# Install pnpm package manager
RUN npm install -g pnpm@9

WORKDIR /app

# Copy package files and Prisma schema
COPY package.json pnpm-lock.yaml ./
COPY libs/database/prisma ./libs/database/prisma

# Install ALL dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile

# Rebuild bcrypt for Alpine Linux
RUN pnpm rebuild bcrypt

# ============================================================================
# Stage 2: Builder - Build the application
# ============================================================================
FROM node:20-alpine3.17 AS builder

RUN apk add --no-cache openssl1.1-compat
RUN npm install -g pnpm@9

WORKDIR /app

# Copy node_modules with properly compiled native bindings from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./package.json
COPY --from=dependencies /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Remove the Prisma Client from dependencies stage (we'll regenerate it with patched schema)
RUN rm -rf /app/node_modules/.prisma/client

# Copy entire source code
COPY . .

# Patch Prisma schema to include linux-musl binary target for Alpine
# Insert binaryTargets after the output line in generator block (Alpine sed syntax)
RUN sed -i '/output.*node_modules\/.prisma\/client/a\  binaryTargets = ["native", "linux-musl"]' libs/database/prisma/schema.prisma

# Verify the schema was patched correctly
RUN cat libs/database/prisma/schema.prisma | head -15

# Generate Prisma Client with correct binary targets (this ensures enums are exported)
RUN npx prisma@5.22.0 generate

# Verify enums are exported in generated Prisma Client
RUN grep -A 5 "export.*NotificationType" /app/node_modules/.prisma/client/index.d.ts || echo "WARNING: NotificationType not found in index.d.ts"

# Check what @prisma/client package.json points to
RUN cat /app/node_modules/@prisma/client/package.json | grep "main\|types"

# Check if @prisma/client index.d.ts exports the enums
RUN grep "NotificationType" /app/node_modules/@prisma/client/index.d.ts | head -5 || echo "WARNING: NotificationType not found in @prisma/client/index.d.ts"

# Build all microservices using nest CLI directly (bypasses prebuild script)
RUN npx nest build api-gateway && \
    npx nest build user-service && \
    npx nest build template-service && \
    npx nest build email-service

# Verify build output exists
RUN ls -la dist/apps/

# ============================================================================
# Stage 3: Production Dependencies - Install only production dependencies
# ============================================================================
FROM node:20-alpine3.17 AS prod-dependencies

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ openssl1.1-compat

RUN npm install -g pnpm@9

WORKDIR /app

# Copy package files and Prisma schema
COPY package.json pnpm-lock.yaml ./
COPY libs/database/prisma ./libs/database/prisma

# Install ONLY production dependencies (ignore scripts to avoid prisma generate failing)
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Manually generate Prisma Client using the same version as @prisma/client
RUN npx prisma@5.22.0 generate

# Rebuild bcrypt for Alpine Linux (pnpm rebuild doesn't need --build-from-source flag)
RUN pnpm rebuild bcrypt

# Verify bcrypt binary exists (BusyBox find doesn't support -ls)
RUN find /app/node_modules -name "bcrypt_lib.node" -type f

# ============================================================================
# Stage 4: Production - Final runtime image
# ============================================================================
FROM node:20-alpine3.17 AS production

# Install only runtime dependencies (no build tools)
RUN apk add --no-cache openssl1.1-compat

# Install PM2 for process management
RUN npm install -g pm2@latest

WORKDIR /app

# Copy production node_modules with properly compiled native bindings
COPY --from=prod-dependencies /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy Prisma client (already generated with correct binaries)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy configuration files
COPY package.json ./
COPY ecosystem.config.js ./
COPY libs/database/prisma ./libs/database/prisma

# Create logs directory and set ownership
RUN mkdir -p logs && \
    chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose ports for all microservices
# 3000: API Gateway
# 3001: User Service
# 3002: Email Service
# 3003: Template Service
# 3004: Push Service
# 5555: Prisma Studio (optional)
EXPOSE 3000 3001 3002 3003 3004 5555

# Health check - verify API Gateway is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Use entrypoint to fix permissions before starting PM2
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start all services using PM2 in runtime mode
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
