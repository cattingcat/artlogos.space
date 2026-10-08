# syntax=docker/dockerfile:1

# The Vite output is platform-independent, so build on the builder's native CPU.
FROM --platform=$BUILDPLATFORM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html tsconfig*.json vite.config.ts ./
COPY src ./src
COPY public ./public
COPY scripts/prerender.mjs scripts/check-seo.mjs ./scripts/
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:15c994d10d6d78658721c3bcafff14cb281fba2a4bdf9d5ba92c416a472516e3 AS runtime
LABEL org.opencontainers.image.source="https://github.com/cattingcat/artlogos.space" \
      org.opencontainers.image.title="Artlogos" \
      org.opencontainers.image.description="Artist portfolio built with React and Vite"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
