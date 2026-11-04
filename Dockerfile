# Multi-stage Dockerfile for SMM Panel (Fullstack Express + React/Vite)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json tsconfig*.json vite.config.ts ./

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy source code
COPY . .

# Build Vite frontend & Express bundle into dist/
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled build output from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/index.html ./index.html

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
