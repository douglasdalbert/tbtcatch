FROM node:22-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY . .

FROM base AS dev
CMD ["npm", "run", "dev"]

FROM base AS production
RUN npm run build
CMD ["npm", "start"]
