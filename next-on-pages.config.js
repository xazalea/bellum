const path = require('path');

// Esbuild plugin to replace async_hooks with a polyfill
const asyncHooksPlugin = {
  name: 'async-hooks-polyfill',
  setup(build) {
    // Intercept imports of async_hooks
    build.onResolve({ filter: /^async_hooks$/ }, () => ({
      path: path.resolve(__dirname, 'lib/webpack/async-hooks-polyfill.js'),
      external: false,
    }));
    
    // Also handle node:async_hooks
    build.onResolve({ filter: /^node:async_hooks$/ }, () => ({
      path: path.resolve(__dirname, 'lib/webpack/async-hooks-polyfill.js'),
      external: false,
    }));
  },
};

/** @type {import('@cloudflare/next-on-pages').NextOnPagesOptions} */
module.exports = {
  // Skip validation to speed up builds
  skipValidation: true,
  // Use the standard output directory
  outputDir: '.vercel/output/static',
  // Ensure static assets are included
  minify: false,
  // Add esbuild plugin for async_hooks polyfill
  esbuildOptions: {
    plugins: [asyncHooksPlugin],
  },
};
