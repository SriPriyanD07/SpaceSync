# SpaceSync Hardened Multi-Stage Dockerfile
# Stage 1: Build TypeScript source in isolated environment
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install build dependencies
RUN npm ci

# Copy TypeScript compilation configurations and application source
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# Stage 2: Minimal, Hardened Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Upgrade OS packages to apply critical security patches
RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*

# Copy production package manifests
COPY package*.json ./

# Install strictly production dependencies and clean cache
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy compiled JavaScript dist and database migrations from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./dist/db/migrations

# Set correct ownership for the non-root user
RUN chown -R node:node /app

# Execute process as unprivileged 'node' user (UID 1000)
USER node

EXPOSE 5000

CMD ["node", "dist/index.js"]
