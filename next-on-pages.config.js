/** @type {import('@cloudflare/next-on-pages').Config} */
module.exports = {
  // Skip the @cloudflare/next-on-pages build check
  skipValidation: false,
  
  // Disable the warning about experimental features
  disableChunksDedup: false,
  
  // Disable the warning about the app directory
  disableWorkerMinification: false,
};
