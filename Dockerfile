# Multi-stage Dockerfile for Express.js + Prisma backend
# Stage 1: Builder
FROM node:20-alpine AS builder

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runtime

# Install dumb-init and curl for healthcheck
RUN apk add --no-cache dumb-init curl mysql-client

# Create non-root user with proper group membership
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Create app directory with proper permissions
WORKDIR /app
RUN chown -R backend:nodejs /app

# Copy built application from builder stage
COPY --from=builder --chown=backend:nodejs /app/dist ./dist
COPY --from=builder --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=backend:nodejs /app/package*.json ./
COPY --from=builder --chown=backend:nodejs /app/prisma ./prisma
COPY --from=builder --chown=backend:nodejs /app/src/generated ./src/generated

# Copy initialization script
COPY --chown=backend:nodejs docker/init.sh ./docker/init.sh
RUN chmod +x ./docker/init.sh

# Create writable temp directory with proper ownership
RUN mkdir -p /tmp/app && \
    chown -R backend:nodejs /tmp/app && \
    chmod -R 755 /tmp/app

# Create sessions directory with proper ownership
RUN mkdir -p /app/sessions && \
    chown -R backend:nodejs /app/sessions && \
    chmod -R 755 /app/sessions

# Switch to non-root user
USER backend

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV TMPDIR=/tmp/app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

# Use dumb-init and run initialization script
ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker/init.sh"]