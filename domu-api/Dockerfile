FROM node:22-alpine AS base

# Versión exacta de pnpm (la misma que "packageManager" en package.json) para
# que host y contenedor no se separen: pnpm 11 lee su configuración de
# pnpm-workspace.yaml, pnpm 10 no.
RUN npm install -g pnpm@11.18.0

WORKDIR /app


# Dependencias compartidas por development y builder. pnpm-workspace.yaml es
# obligatorio en el COPY: lleva el allowBuilds que permite compilar argon2 y los
# demás módulos nativos. Sin él pnpm omite esos scripts de build en silencio y
# la API falla en tiempo de ejecución al hashear contraseñas.
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

RUN pnpm install --frozen-lockfile


# Development (docker compose): se queda como root para que el bind mount del
# código del host siga siendo escribible.
FROM deps AS development

COPY . .

CMD ["pnpm", "dev"]


FROM deps AS builder

COPY . .

RUN pnpm run build


# Production. Dokploy toma el último stage por defecto, así que este va al final.
# NODE_ENV=production además activa migrationsRun (app.module.ts).
FROM base AS production

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder --chown=node:node /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
