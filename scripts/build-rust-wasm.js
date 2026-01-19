#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const wasmModules = [
  'compression',
  'fingerprint',
  'game-parser',
  'storage'
];

const wasmDir = path.join(__dirname, '..', 'wasm');
const publicWasmDir = path.join(__dirname, '..', 'public', 'wasm');

// Ensure public/wasm directory exists
if (!fs.existsSync(publicWasmDir)) {
  fs.mkdirSync(publicWasmDir, { recursive: true });
}

// Check if wasm-pack is installed
try {
  execSync('wasm-pack --version', { stdio: 'ignore' });
} catch (error) {
  console.log('⚠️  wasm-pack not found. Install with:');
  console.log('   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh');
  console.log('⏭️  Skipping Rust WASM build (will use JS fallbacks)');
  process.exit(0);
}

console.log('🦀 Building Rust WASM modules...\n');

for (const module of wasmModules) {
  const modulePath = path.join(wasmDir, module);
  const cargoToml = path.join(modulePath, 'Cargo.toml');
  
  if (!fs.existsSync(cargoToml)) {
    console.log(`⏭️  Skipping ${module} (no Cargo.toml found)`);
    continue;
  }

  console.log(`📦 Building ${module}...`);
  try {
    execSync(`wasm-pack build --target web --out-dir ../../lib/wasm/${module}-pkg`, {
      cwd: modulePath,
      stdio: 'inherit'
    });
    
    // Copy .wasm file to public directory
    const pkgDir = path.join(__dirname, '..', 'lib', 'wasm', `${module}-pkg`);
    const wasmFiles = fs.readdirSync(pkgDir).filter(f => f.endsWith('.wasm'));
    
    if (wasmFiles.length > 0) {
      const srcWasm = path.join(pkgDir, wasmFiles[0]);
      const destWasm = path.join(publicWasmDir, `${module}.wasm`);
      fs.copyFileSync(srcWasm, destWasm);
      console.log(`✅ ${module}.wasm built successfully\n`);
    }
  } catch (error) {
    console.error(`❌ Failed to build ${module}:`, error.message);
    process.exit(1);
  }
}

console.log('✨ All Rust WASM modules built successfully!');
