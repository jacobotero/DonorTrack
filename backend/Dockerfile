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
RUN npx tsc --outDir dist

# ---- Runtime stage: production dependencies only ----
FROM public.ecr.aws/lambda/nodejs:22
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=builder /var/task/dist ./dist

CMD ["dist/lambda.handler"]
