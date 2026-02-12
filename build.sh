#!/usr/bin/env bash
set -e

echo "==> Building structsolve Vite app..."
cd structsolve
npm install
npm run build
cd ..

echo "==> Assembling output directory..."
rm -rf dist
mkdir -p dist/structsolve

# Copy root static files
cp index.html dist/
cp contact.html dist/
cp contribution.html dist/
cp -r hydro dist/

# Copy built Vite app into dist/structsolve/
cp -r structsolve/dist/* dist/structsolve/

echo "==> Build complete. Contents of dist/:"
ls -R dist/
