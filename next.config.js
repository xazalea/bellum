const webpack = require('webpack');
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Static redirects - handled by Next.js without edge runtime!
  // This saves ~650KB from the edge worker bundle
  async redirects() {
    return [
      {
        source: '/games/:id',
        destination: '/run?id=:id',
        permanent: false,
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@ffmpeg-installer/ffmpeg',
      '@ffprobe-installer/ffprobe',
      'fluent-ffmpeg',
      'puppeteer',
      'puppeteer-extra',
      'puppeteer-extra-plugin-stealth',
      '@google/generative-ai',
      'tiktoken',
      'ai',
      'openai',
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
      // and reduce bundle size (CF Pages 3 MiB free tier limit)
      // Sorted by impact: largest first
      const packagesToAlias = [
        // AI/LLM packages (HUGE - tiktoken is 1MB+)
        'tiktoken', '@google/generative-ai',
        // Firebase Admin + Client (massive)
        'firebase-admin', 'firebase', '@google-cloud/firestore', 'google-gax', 'google-auth-library', 
        'gcp-metadata', 'google-logging-utils', '@firebase/analytics', '@firebase/auth', 
        '@firebase/firestore', '@firebase/app', '@firebase/app-check', '@firebase/database', '@firebase/storage',
        // 3D/Graphics (three is ~500KB minified)
        'three', '@react-three/fiber', '@react-three/drei',
        // Animation libraries
        'gsap', '@gsap/react', 'motion', 'framer-motion', 'animejs',
        // Heavy utilities
        'lodash', 'uuid', 'moment', 'axios', 'chalk', 'ws',
        // File processing
        'xlsx', 'pdf-parse', 'image-size', 'adm-zip', 'jszip', 'fflate',
        // Other heavy deps
        'event-stream', 'stream', 'form-data', 'joi', 'turndown', 'tunnel',
        'user-agents', 'opencc-js', 'string-similarity', 'mint-filter', 'js-sha3',
        // Logging
        'winston', 'winston-transport', '@elastic/ecs-winston-format', 'elastic-apm-node', 'heapdump',
        // Local gpt4free
        '@/lib/gpt4free',
        // Puppeteer/FFmpeg (shouldn't be in edge anyway)
        'puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth',
        '@ffmpeg-installer/ffmpeg', '@ffprobe-installer/ffprobe', 'fluent-ffmpeg',
        // GPU/Compute (large, not needed on edge)
        'gpu.js', 'ioredis',
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