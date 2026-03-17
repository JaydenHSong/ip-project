# ─── Stage 1: Build ───
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/

RUN pnpm build

# ─── Stage 2: Production ───
FROM mcr.microsoft.com/playwright:v1.58.2-noble

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

ENV PORT=8080
EXPOSE 8080

USER pwuser

CMD ["node", "dist/index.js"]
