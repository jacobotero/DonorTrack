#!/bin/bash
set -e

echo "Cleaning old builds..."
rm -rf dist-lambda dist-lambda-install

echo "Compiling TypeScript..."
npx tsc --outDir dist-lambda

echo "Creating install directory..."
mkdir dist-lambda-install
cp package.json package-lock.json dist-lambda-install/

echo "Installing production dependencies..."
cd dist-lambda-install
npm ci --omit=dev

echo "Generating Prisma client with RHEL engine..."
PRISMA_CLI_BINARY_TARGETS=rhel-openssl-3.0.x npx prisma generate --schema=../prisma/schema.prisma

echo "Copying dependencies to dist-lambda..."
cd ..
cp -r dist-lambda-install/node_modules dist-lambda/node_modules
cp package.json dist-lambda/package.json

echo "Removing Prisma CLI and TypeScript (not needed at runtime)..."
rm -rf dist-lambda/node_modules/prisma
rm -rf dist-lambda/node_modules/typescript

echo "Removing non-RHEL Prisma engine binaries..."
find dist-lambda/node_modules/@prisma/engines -type f ! -name "*rhel*" ! -name "*.d.ts" ! -name "*.md" ! -name "package.json" ! -name "*.txt" -delete

echo "Cleaning up temporary install directory..."
rm -rf dist-lambda-install

echo "Build complete!"
