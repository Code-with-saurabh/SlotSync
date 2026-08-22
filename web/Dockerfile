# ---------- Stage 1: build ----------
FROM node:20.11-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Stage 2: serve static build ----------
FROM node:20.11-alpine AS runtime

WORKDIR /app

RUN npm install -g serve@14.2.1

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]