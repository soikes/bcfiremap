FROM oven/bun:1.3.10 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG PUBLIC_EXAMPLE_BANS=false
ENV PUBLIC_EXAMPLE_BANS=$PUBLIC_EXAMPLE_BANS
RUN bun run build

FROM oven/bun:1.3.10-slim AS bun

FROM nginxinc/nginx-unprivileged:stable
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist/public /usr/share/nginx/html
COPY --from=build /app/dist/server /app/server
COPY start.sh /app/start.sh
EXPOSE 8080
CMD ["/app/start.sh"]
