# Stage 1: Build
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY core/package.json ./core/

# No --frozen-lockfile: with it, Bun's isolated linker writes each workspace's dependency
# symlinks (e.g. apps/server/node_modules/prisma) as an absolute path copied from wherever
# bun.lock was originally generated (this repo's Windows host), even though the install
# itself runs entirely inside this Linux container — producing dangling symlinks that break
# `bunx prisma generate` and the app at runtime. A plain `bun install`, using the same
# committed bun.lock and resolving the exact same package versions, writes correct
# container-relative symlinks instead. bun.lock still pins versions either way.
RUN bun install

COPY . .

RUN cd apps/server && bunx prisma generate
RUN cd apps/web && bunx vite build

# Stage 2: Production
FROM oven/bun:1 AS production
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY core/package.json ./core/

# Installed fresh here rather than copied from the build stage: Bun's isolated linker
# symlinks each workspace's deps into a root node_modules/.bun store, and Bun's runtime
# resolver expects those per-workspace symlinks to exist on disk — it doesn't fall back to
# walking up to the root node_modules the way plain Node resolution would. Copying that
# symlink farm across a Docker COPY (or across stages) doesn't reliably reproduce it, so
# each stage that runs Bun code installs for itself instead.
RUN bun install

COPY apps/server ./apps/server
COPY core ./core

COPY --from=build /app/apps/web/dist ./apps/web/dist
# Overlay generated Prisma client from the build stage
COPY --from=build /app/apps/server/src/generated ./apps/server/src/generated

ENV NODE_ENV=production
EXPOSE 3001

# cwd stays inside apps/server (matches how "bun run start" already works in dev) rather
# than cd'ing back to /app — Bun's runtime resolver fails to walk up to the root
# node_modules for a relative entry path run from /app, even though the same file resolves
# fine when run with apps/server as cwd.
CMD ["sh", "-c", "cd apps/server && bunx prisma migrate deploy && bun run start"]
