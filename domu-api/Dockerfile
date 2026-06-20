FROM node:22-alpine AS builder

RUN npm install -g pnpm@10

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install

COPY . .

RUN pnpm run build


FROM node:22-alpine AS production

RUN npm install -g pnpm@10

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --prod

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/main.js"]