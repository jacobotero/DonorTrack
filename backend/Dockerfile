# Container-image Lambda, not a zip deployment: @prisma/client (v7) bundles
# WASM query compilers for every database Prisma supports (Postgres, MySQL,
# SQLite, SQL Server, CockroachDB) regardless of what this app actually
# uses, and regardless of schema.prisma's `binaryTargets` setting — that
# alone runs ~45MB+, pushing the total node_modules well past Lambda's
# 250MB *unzipped* limit for a plain zip package. Container images have a
# 10GB limit instead, which comfortably fits this without needing to fight
# Prisma's packaging.

# ---- Build stage: needs devDependencies (typescript) to compile ----
FROM public.ecr.aws/lambda/nodejs:22 AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma
RUN npx prisma generate
RUN npx tsc --outDir dist

# ---- Runtime stage: production dependencies only ----
FROM public.ecr.aws/lambda/nodejs:22
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
# Copying the already-generated client from the builder stage instead of
# running `npx prisma generate` again here: this stage's `npm ci --omit=dev`
# never installs the `prisma` devDependency, so `npx` would fetch whatever
# CLI version is currently latest on the registry at build time — an
# unpinned network dependency that could generate a client mismatched with
# the pinned `@prisma/client` version, or just fail if the registry is
# unreachable. The builder stage already generated it with the correct,
# lockfile-pinned CLI. Both directories are required: `@prisma/client` is
# the public package, but its actual generated code (including the
# schema-specific compiled query engine) lives in `.prisma/client`, which
# `@prisma/client` requires at runtime — verified locally via a real
# `docker build`, since copying only `@prisma/client` builds fine but
# throws `Cannot find module '.prisma/client/default'` at runtime.
COPY --from=builder /var/task/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /var/task/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /var/task/dist ./dist

CMD ["dist/lambda.handler"]
