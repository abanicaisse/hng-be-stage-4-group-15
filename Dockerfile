# Multi-stage Dockerfile for NestJS Microservices
# Stage 1: Build
FROM node:20-alpine AS builder

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
FROM node:20-alpine AS production

# Install pnpm and PM2
RUN npm install -g pnpm pm2

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy Prisma schema and generate client
COPY libs/database/prisma ./libs/database/prisma
RUN pnpm run prisma:generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY ecosystem.config.js ./

# Create logs directory
RUN mkdir -p logs

# Expose ports for all services
EXPOSE 3000 3001 3002 3003 3004 5555

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start services with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
