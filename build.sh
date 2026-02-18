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

echo "==> Building rootfinder Vite app..."
cd rootfinder
npm install
npm run build
cd ..

# Verify Vite produced the built index.html (not the source file)
if ! grep -q 'assets/' rootfinder/dist/index.html 2>/dev/null; then
  echo "ERROR: rootfinder/dist/index.html missing or not built correctly"
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
cp -r contributors dist/

# Copy built Vite apps into dist/
cp -r structsolve/dist dist/structsolve
cp -r rootfinder/dist dist/rootfinder

echo "==> Build complete. Contents of dist/:"
ls -R dist/
echo "==> dist/structsolve/index.html:"
cat dist/structsolve/index.html
echo "==> dist/rootfinder/index.html:"
cat dist/rootfinder/index.html
