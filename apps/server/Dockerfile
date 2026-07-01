FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@11.9.0

# Copy workspace config and package.json files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build shared package and server app
RUN pnpm --filter @domino/shared build
RUN pnpm --filter @domino/server build

# Production image
FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm@11.9.0

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/server/package.json ./apps/server/

# Install only production dependencies
RUN pnpm install --prod

# Copy built assets
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist

EXPOSE 4000
CMD ["node", "apps/server/dist/index.js"]
