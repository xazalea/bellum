#!/usr/bin/env node
/**
 * Post-build script to patch async_hooks imports in Cloudflare Workers
 * This replaces `import * as X from "async_hooks"` with an inline polyfill
 */

const fs = require('fs');
const path = require('path');

const workerDir = path.join(__dirname, '..', '.vercel', 'output', 'static', '_worker.js');

// Inline async_hooks polyfill
const asyncHooksPolyfill = `
// Inline async_hooks polyfill for Cloudflare Workers
var AsyncLocalStorage = class {
  constructor() { this._store = undefined; }
  getStore() { return this._store; }
  run(store, callback, ...args) {
    const previousStore = this._store;
    this._store = store;
    try { return callback(...args); }
    finally { this._store = previousStore; }
  }
  exit(callback, ...args) {
    const previousStore = this._store;
    this._store = undefined;
    try { return callback(...args); }
    finally { this._store = previousStore; }
  }
  enterWith(store) { this._store = store; }
};
var async_hooks = { AsyncLocalStorage, AsyncResource: class { runInAsyncScope(fn, ...args) { return fn(...args); } } };
`;

// Inline polyfill that will be inserted into each function file
const inlinePolyfill = `var AsyncLocalStorage=class{constructor(){this._store=void 0}getStore(){return this._store}run(t,e,...n){const s=this._store;this._store=t;try{return e(...n)}finally{this._store=s}}exit(t,...e){const n=this._store;this._store=void 0;try{return t(...e)}finally{this._store=n}}enterWith(t){this._store=t}};`;

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`[PATCH] File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if the file imports async_hooks
  if (!content.includes('from"async_hooks"') && !content.includes('from "async_hooks"')) {
    return false;
  }

  console.log(`[PATCH] Patching async_hooks in: ${filePath}`);

  // Replace the import with inline polyfill
  // Pattern: import * as pt from"async_hooks"; or import*as pt from"async_hooks"
  content = content.replace(
    /import\s*\*\s*as\s+(\w+)\s*from\s*["']async_hooks["'];?/g,
    (match, varName) => {
      // Inline the polyfill and assign to the variable
      return `${inlinePolyfill}var ${varName}={AsyncLocalStorage,AsyncResource:class{runInAsyncScope(t,...e){return t(...e)}}};`;
    }
  );

  // Also handle node:async_hooks
  content = content.replace(
    /import\s*\*\s*as\s+(\w+)\s*from\s*["']node:async_hooks["'];?/g,
    (match, varName) => {
      return `${inlinePolyfill}var ${varName}={AsyncLocalStorage,AsyncResource:class{runInAsyncScope(t,...e){return t(...e)}}};`;
    }
  );

  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function patchWorkerIndex() {
  const indexPath = path.join(workerDir, 'index.js');
  if (!fs.existsSync(indexPath)) {
    console.log('[PATCH] index.js not found');
    return;
  }

  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Add the polyfill at the very beginning of the file
  if (!content.includes('// Inline async_hooks polyfill')) {
    console.log('[PATCH] Injecting async_hooks polyfill into index.js');
    content = asyncHooksPolyfill + '\n' + content;
    fs.writeFileSync(indexPath, content, 'utf8');
  }
}

function main() {
  console.log('[PATCH] Starting async_hooks patch...');

  // Patch the main index.js to include the polyfill
  patchWorkerIndex();

  // Patch all function files
  const functionsDir = path.join(workerDir, '__next-on-pages-dist__', 'functions');
  
  if (fs.existsSync(functionsDir)) {
    const files = fs.readdirSync(functionsDir, { recursive: true });
    let patchedCount = 0;
    
    for (const file of files) {
      if (file.endsWith('.func.js')) {
        const filePath = path.join(functionsDir, file);
        if (patchFile(filePath)) {
          patchedCount++;
        }
      }
    }
    
    console.log(`[PATCH] Patched ${patchedCount} function files`);
  }

  console.log('[PATCH] Done!');
}

main();