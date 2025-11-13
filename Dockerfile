# Multi-stage Dockerfile for NestJS Microservices

# Stage 1: Build
# We lock the version to 3.17 to ensure OpenSSL compatibility
FROM node:20-alpine3.17 AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY libs/database/prisma ./libs/database/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN pnpm run prisma:generate

# Build all services
RUN pnpm run build:all

# Stage 2: Production
# We lock the version to 3.17 to ensure OpenSSL compatibility
FROM node:20-alpine3.17 AS production

# Install pnpm and PM2
RUN npm install -g pnpm pm2

# Install the correct OpenSSL 1.1 package for Alpine 3.17
RUN apk add --no-cache openssl1.1-compat

# Set working directory
WORKDIR /app

# --- This is the new, robust logic ---

# Copy package.json to be able to run pnpm prune
COPY package.json ./

# Copy the ENTIRE node_modules from builder
# This fixes BOTH the bcrypt AND the Prisma Engine errors
# because it brings all native binaries and the fully generated client.
COPY --from=builder /app/node_modules ./node_modules

# Remove all development dependencies
RUN pnpm prune --prod

# Copy the Prisma schema for Prisma Studio
# This fixes the "Could not load schema" error
COPY libs/database/prisma ./libs/database/prisma

# --- End of new logic ---

# Copy built application from builder
COPY --from=builder /app/dist ./dist
# --- FIX: Copy the correct production config file ---
COPY ecosystem.config.prod.js ./

# Create logs directory
RUN mkdir -p logs

# Expose ports for all services
EXPOSE 3000 3001 3002 3003 3004 5555

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start services with PM2
# --- FIX: Start the correct production config file ---
CMD ["pm2-runtime", "start", "ecosystem.config.prod.js"]