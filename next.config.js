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
    // Node.js built-ins are provided by Almostnode at runtime on CF Pages
    if (nextRuntime === 'edge') {
      config.resolve.alias = config.resolve.alias || {};

      // ── Node-only packages that CANNOT run on edge runtime ──────────
      // These must be aliased to false ONLY for edge builds.
      // In Node.js runtime, serverExternalPackages lets webpack externalize
      // them so they load at runtime via require() — alias=false would break that.
      config.resolve.alias['winston'] = false;
      config.resolve.alias['winston-transport'] = false;
      config.resolve.alias['@elastic/ecs-winston-format'] = false;
      config.resolve.alias['elastic-apm-node'] = false;
      config.resolve.alias['heapdump'] = false;
      config.resolve.alias['tiktoken'] = false;
      config.resolve.alias['firebase-admin'] = false;
      config.resolve.alias['@google-cloud/firestore'] = false;
      config.resolve.alias['google-gax'] = false;
      config.resolve.alias['google-auth-library'] = false;
      config.resolve.alias['gcp-metadata'] = false;
      config.resolve.alias['google-logging-utils'] = false;

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
      // ReferenceError in the edge sandbox during build. Some transitive
      // dependencies also reference `document` at module level. The stubs
      // prevent these from crashing the build; packages aliased to `false`
      // above will return empty modules at runtime (their functions won't work
      // on edge — that's expected for Node-only deps like winston/tiktoken).
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
