FROM node:22.13-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM node:22.13-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w @evolvefit/shared && npm run build -w @evolvefit/api

FROM node:22.13-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV APP_ENV=production
ENV API_DATA_MODE=supabase
ENV PORT=4000

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api ./apps/api
COPY --from=build --chown=node:node /app/packages/shared ./packages/shared
COPY --from=build --chown=node:node /app/docs/api-v1.openapi.json ./docs/api-v1.openapi.json
# Never bake local secrets into the image; configure them at deploy time.
RUN rm -f ./apps/api/.env

USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1
CMD ["npm", "run", "start:api"]
