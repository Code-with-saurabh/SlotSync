# ---------- Stage 1: install deps + build (if needed) ----------
FROM node:20.11-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# ---------- Stage 2: production runtime ----------
FROM node:20.11-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Only production deps in the final image
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts

# Non-root user (alpine images ship a "node" user already)
USER node

EXPOSE 4000

CMD ["node", "src/server.js"]