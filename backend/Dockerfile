# Multi-stage build for production
FROM node:18-alpine AS base

# Dependencies stage - install production dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install production dependencies
RUN npm ci --only=production && \
    npx prisma generate

# Builder stage - compile TypeScript
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source files
COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src

# Install ALL dependencies (including dev dependencies for TypeScript)
RUN npm install

# Build TypeScript to dist/ directory
RUN npm run build && \
    ls -la dist/ && \
    echo "✓ TypeScript build complete"

# Production runtime stage
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Install runtime dependencies
RUN apk add --no-cache openssl curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy Prisma schema and generated client
COPY --from=deps /app/prisma ./prisma

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist

# Copy prompt templates (not compiled by TypeScript)
COPY --from=builder /app/src/services/ai/prompts ./dist/services/ai/prompts

# Copy package.json for npm scripts
COPY --from=builder /app/package.json ./package.json

# Verify dist/ folder exists and contains server.js
RUN ls -la && \
    ls -la dist/ && \
    test -f dist/server.js || (echo "ERROR: dist/server.js not found!" && exit 1) && \
    echo "✓ dist/server.js verified"

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check using curl (more reliable than node script)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
# Ensure database schema is up to date before starting the server.
# This is safe to run on every deploy because `prisma migrate deploy`
# only applies pending migrations and is a no-op when schema is current.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
