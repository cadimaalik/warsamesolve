#!/usr/bin/env bash
set -e

echo "==> Building structsolve Vite app..."
cd structsolve
npm install
npm run build
cd ..

# Verify Vite produced the built index.html (not the source file)
if ! grep -q 'assets/' structsolve/dist/index.html 2>/dev/null; then
  echo "ERROR: structsolve/dist/index.html missing or not built correctly"
  exit 1
fi

echo "==> Assembling output directory..."
rm -rf dist
mkdir -p dist

# Copy root static files
cp index.html dist/
cp contact.html dist/
cp contribution.html dist/
cp logo.svg dist/
cp -r hydro dist/
cp _redirects dist/

# Copy built Vite app into dist/structsolve/
cp -r structsolve/dist dist/structsolve

echo "==> Build complete. Contents of dist/:"
ls -R dist/
echo "==> dist/structsolve/index.html:"
cat dist/structsolve/index.html
