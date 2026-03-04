# ─── Stage 1: Build ───────────────────────────────────────
FROM node:22-slim AS builder

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files first (layer caching)
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including devDependencies for tsc)
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN pnpm build

# ─── Stage 2: Production ─────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.49.1-noble

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod 2>/dev/null || pnpm install --prod

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Health check port
ENV PORT=8080
EXPOSE 8080

# Run as non-root for security
USER pwuser

CMD ["node", "dist/index.js"]
