FROM oven/bun:1.3.10 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG PUBLIC_EXAMPLE_BANS=false
ENV PUBLIC_EXAMPLE_BANS=$PUBLIC_EXAMPLE_BANS
RUN bun run build

FROM oven/bun:1.3.10-slim
WORKDIR /app
COPY --from=build /app/dist ./
ENV NODE_ENV=production PORT=8080
USER bun
EXPOSE 8080
CMD ["bun", "server.js"]
