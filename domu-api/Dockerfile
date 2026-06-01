FROM node:22-alpine AS base
RUN npm install -g pnpm@10
WORKDIR /app

FROM base AS development
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install
COPY . .
CMD ["pnpm", "run", "dev"]

FROM base AS production
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --prod
COPY . .
RUN pnpm run build
CMD ["node", "dist/main.js"]