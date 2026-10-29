# Stage 1: Build TypeScript source
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy TypeScript configuration and source files
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production runtime dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist

# Copy database migrations directory for runtime execution
COPY --from=builder /app/src/db/migrations ./dist/db/migrations

# Run as non-root user for security hardening
USER node

EXPOSE 5000

CMD ["node", "dist/index.js"]
