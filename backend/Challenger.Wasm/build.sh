#!/bin/bash
# Build script for Challenger WASM module
# Requires .NET 8.0 SDK

set -e

echo "Building Challenger WASM module..."

cd "$(dirname "$0")"

# Restore dependencies
echo "Restoring dependencies..."
dotnet restore

# Build for WASM
echo "Building WASM..."
dotnet publish -c Release -o ./dist

# Copy output to public/wasm
echo "Copying WASM output to public directory..."
mkdir -p ../../public/wasm
cp -r ./dist/* ../../public/wasm/

echo "WASM build complete!"
echo "Output: public/wasm/"
ls -la ./dist/