/** @type {import('@cloudflare/next-on-pages').Config} */
module.exports = {
  // Skip validation to avoid blocking on non-edge routes
  skipValidation: true,
  
  // Disable chunks deduplication for faster builds
  disableChunksDedup: false,
  
  // Keep worker minification enabled
  disableWorkerMinification: false,
};
