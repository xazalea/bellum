const webpack = require('webpack');
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    '@ffmpeg-installer/ffmpeg',
    '@ffprobe-installer/ffprobe',
    'fluent-ffmpeg',
    'puppeteer',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    'firebase-admin',
    '@google-cloud/firestore',
    'google-gax',
    'google-auth-library',
    'gcp-metadata',
  ],
  webpack: (config, { isServer, nextRuntime }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    // Handle Node.js modules for edge runtime with Almostnode
    if (nextRuntime === 'edge') {
      // Provide empty implementations for Node.js built-ins that will be provided by Almostnode at runtime
      const nodeModules = [
        'fs', 'path', 'stream', 'crypto', 'os', 'buffer', 'events', 'util',
        'url', 'querystring', 'http', 'https', 'net', 'tls', 'zlib',
        'child_process', 'cluster', 'dgram', 'dns', 'readline', 'repl',
        'vm', 'worker_threads', 'module', 'http2', 'perf_hooks', 'async_hooks',
        'timers', 'constants', 'v8', 'process',
      ];

      // Use resolve.fallback for edge runtime
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};

      nodeModules.forEach(mod => {
        if (!config.resolve.fallback[mod]) {
          config.resolve.fallback[mod] = false; // Don't bundle, will be provided by Almostnode
        }
        // Also handle node: prefixed imports
        config.resolve.fallback[`node:${mod}`] = false;
      });

      // Provide empty shims for packages that can't be bundled for edge
      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias['@ffmpeg-installer/ffmpeg'] = path.resolve(__dirname, 'lib/compat/empty-ffmpeg.js');
      config.resolve.alias['@ffprobe-installer/ffprobe'] = path.resolve(__dirname, 'lib/compat/empty-ffprobe.js');
      config.resolve.alias['fluent-ffmpeg'] = path.resolve(__dirname, 'lib/compat/empty-fluent-ffmpeg.js');
      config.resolve.alias['puppeteer'] = path.resolve(__dirname, 'lib/compat/empty-puppeteer.js');
      config.resolve.alias['puppeteer-extra'] = path.resolve(__dirname, 'lib/compat/empty-puppeteer.js');
      config.resolve.alias['puppeteer-extra-plugin-stealth'] = path.resolve(__dirname, 'lib/compat/empty-puppeteer.js');

      // Exclude firebase-admin and its dependencies from edge bundles
      // These will fail at runtime if used in edge routes
      config.resolve.alias['firebase-admin'] = false;
      config.resolve.alias['@google-cloud/firestore'] = false;
      config.resolve.alias['google-gax'] = false;
      config.resolve.alias['google-auth-library'] = false;
      config.resolve.alias['gcp-metadata'] = false;
      config.resolve.alias['google-logging-utils'] = false;
    }

    // Ignore README.md and other non-JS files being imported from node_modules
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\.md$|\.txt$|LICENSE/,
        contextRegExp: /node_modules/,
      }),
      // Fix UnhandledSchemeError for "node:" URIs in edge runtime
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      })
    );

    return config;
  },
};

module.exports = nextConfig;
