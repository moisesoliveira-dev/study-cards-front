# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

# --- Dependencies ---
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
ENV CYPRESS_INSTALL_BINARY=0
RUN --mount=type=cache,target=/root/.npm \
  npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm ci

# --- Development ---
FROM node:${NODE_VERSION}-alpine AS development
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development
ENV VITE_API_URL=http://localhost:3000/api

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# --- Build ---
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# --- Production ---
FROM nginx:1.27-alpine AS production

RUN apk add --no-cache gettext \
  && rm -rf /usr/share/nginx/html/*

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint-custom.sh
RUN chmod +x /docker-entrypoint-custom.sh

ENV PORT=80
ENV API_URL=/api
ENV BACKEND_UPSTREAM=http://backend:3000

EXPOSE 80

CMD ["/docker-entrypoint-custom.sh"]
