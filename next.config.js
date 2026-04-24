const webpack = require('webpack');
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@ffmpeg-installer/ffmpeg',
      '@ffprobe-installer/ffprobe',
      'fluent-ffmpeg',
      'puppeteer',
      'puppeteer-extra',
      'puppeteer-extra-plugin-stealth',
    ],
  },
  webpack: (config, { isServer, nextRuntime }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    // ── Shims for ALL server builds (node + edge) ──────────────────
    if (isServer) {
      config.resolve.alias = config.resolve.alias || {};

      // ── Browser-only packages ──────────────────────────────────────
      // These reference `document` / `window` at module level and crash
      // any server-side build. They must only be loaded on the client.
      config.resolve.alias['@fingerprintjs/fingerprintjs'] = false;
      config.resolve.alias['@thumbmarkjs/thumbmarkjs'] = false;
      config.resolve.alias['fingerprint-injector'] = false;
      config.resolve.alias['fingerprint-generator'] = false;

      // Native/bin packages that can't be bundled for any server runtime
      // (compat shims that export empty objects, not `false`)
      config.resolve.alias['@ffmpeg-installer/ffmpeg'] = path.resolve(__dirname, 'lib/compat/empty-ffmpeg.js');
      config.resolve.alias['@ffprobe-installer/ffprobe'] = path.resolve(__dirname, 'lib/compat/empty-ffprobe.js');
      config.resolve.alias['fluent-ffmpeg'] = path.resolve(__dirname, 'lib/compat/empty-fluent-ffmpeg.js');
      config.resolve.alias['puppeteer'] = path.resolve(__dirname, 'lib/compat/empty-puppeteer.js');
      config.resolve.alias['puppeteer-extra'] = path.resolve(__dirname, 'lib/compat/empty-puppeteer.js');
      config.resolve.alias['puppeteer-extra-plugin-stealth'] = path.resolve(__dirname, 'lib/compat/empty-puppeteer.js');
    }

    // ── Edge-runtime-specific shims ─────────────────────────────────
    // Node.js built-ins and heavy packages are provided by Almostnode at runtime on CF Pages
    if (nextRuntime === 'edge') {
      config.resolve.alias = config.resolve.alias || {};

      // ── Node-only packages that CANNOT run on edge runtime ──────────
      // These must be aliased to false for edge builds to prevent crashes
      // and reduce bundle size (CF Pages 25MB limit)
      const packagesToAlias = [
        // Logging
        'winston', 'winston-transport', '@elastic/ecs-winston-format', 'elastic-apm-node', 'heapdump',
        // AI/LLM packages (too large for edge)
        'tiktoken',
        // Firebase Admin + Client
        'firebase-admin', 'firebase', '@google-cloud/firestore', 'google-gax', 'google-auth-library', 'gcp-metadata', 'google-logging-utils',
        '@firebase/analytics', '@firebase/auth', '@firebase/firestore', '@firebase/app', '@firebase/app-check', '@firebase/database', '@firebase/storage',
        // Large dependencies
        'uuid', 'lodash', 'chalk', 'moment', 'axios', 'form-data',
        'event-stream', 'stream', 'xlsx', 'pdf-parse', 'image-size',
        'string-similarity', 'user-agents', 'opencc-js', 'joi', 'turndown',
        'mint-filter', 'js-sha3', 'tunnel',
        // More large packages
        'ws', 'adm-zip', 'jszip', 'fflate', 'three',
        // Local gpt4free
        '@/lib/gpt4free',
      ];

      packagesToAlias.forEach(pkg => {
        config.resolve.alias[pkg] = false;
      });

      const nodeModules = [
        'fs', 'path', 'stream', 'crypto', 'os', 'buffer', 'events', 'util',
        'url', 'querystring', 'http', 'https', 'net', 'tls', 'zlib',
        'child_process', 'cluster', 'dgram', 'dns', 'readline', 'repl',
        'vm', 'worker_threads', 'module', 'http2', 'perf_hooks', 'async_hooks',
        'timers', 'constants', 'v8', 'process',
      ];

      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};

      nodeModules.forEach(mod => {
        if (!config.resolve.fallback[mod]) {
          config.resolve.fallback[mod] = false;
        }
        config.resolve.fallback[`node:${mod}`] = false;
      });

      // Inject document/window/self stubs into the edge runtime bundle.
      // Webpack's own runtime code references `document.baseURI` and `self`
      // (e.g. `t.b=document.baseURI||self.location.href`), which throws
      // ReferenceError in the edge sandbox during build. The stubs prevent
      // these from crashing the build; packages aliased to `false` will
      // return empty modules at runtime (their functions won't work on edge).
      const globalStubs = require('fs').readFileSync(
        path.resolve(__dirname, 'lib/compat/global-stubs.js'),
        'utf8'
      );
      config.plugins = config.plugins || [];
      config.plugins.unshift(
        new webpack.BannerPlugin({
          banner: globalStubs,
          raw: true,
          entryOnly: true,
        })
      );
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
