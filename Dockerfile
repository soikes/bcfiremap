FROM oven/bun:1 AS build
WORKDIR /app
ENV CI=1 EXPO_NO_TELEMETRY=1
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG EXPO_PUBLIC_EXAMPLE_BANS
ENV EXPO_PUBLIC_EXAMPLE_BANS=$EXPO_PUBLIC_EXAMPLE_BANS
RUN bun run build:web

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
