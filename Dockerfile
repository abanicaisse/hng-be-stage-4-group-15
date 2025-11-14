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

# --- FIX 1: Patch schema.prisma to include the 'linux-musl' binary target ---
# This fixes the PrismaClientInitializationError at runtime.
# --- FIX: Corrected regex (removed extra " before ]) ---
RUN sed -i 's/\(binaryTargets *= *\[.*\)\]/\1, "linux-musl"]/' libs/database/prisma/schema.prisma

# Generate Prisma Client (now with the correct targets)
RUN pnpm run prisma:generate

# Build all services
RUN pnpm run build:all

# --- NEW DISK-EFFICIENT STEP ---
# Prune development dependencies HERE, in the builder,
# so the final node_modules is small.
# --ignore-scripts prevents postinstall from running after prune
RUN pnpm prune --prod --ignore-scripts

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

# Copy package.json AND lockfile (needed for pnpm rebuild)
COPY package.json pnpm-lock.yaml ./

# Copy the ALREADY-PRUNED node_modules from builder
# This is much smaller and should not fill the disk.
# This fixes bcrypt and Prisma errors.
COPY --from=builder /app/node_modules ./node_modules

# --- FIX: Copy Prisma schema for 'pnpm rebuild' ---
# The 'pnpm rebuild' command triggers a 'postinstall' script for Prisma,
# which runs 'prisma generate'. That command requires the schema file.
COPY --from=builder /app/libs/database/prisma ./libs/database/prisma

# Copy built application from builder
COPY --from=builder /app/dist ./dist
# --- FIX: Copy the correct, user-renamed config file ---
COPY ecosystem.config.js ./

# --- NEW FIX: Make all script paths in the config file absolute ---
RUN sed -i "s|script: 'dist/|script: '/app/dist/|g" ecosystem.config.js

# --- FINAL FIX: Rebuild native dependencies (bcrypt, prisma) ---
# Install build-tools, run rebuilds, then remove build-tools in one layer
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    pnpm rebuild && \
    pnpm rebuild bcrypt && \
    apk del .build-deps

# Create logs directory
RUN mkdir -p logs

# Expose ports for all services
EXPOSE 3000 3001 3002 3003 3004 5555

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start services with PM2
# --- FIX: Use pm2-runtime with the correct config file name ---
# Now that you've fixed the filename, this is the correct command.
CMD ["pm2-runtime", "ecosystem.config.js"]