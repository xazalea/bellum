const { execSync } = require('child_process');
const { version: packageVersion } = require('./package.json');

const resolveBuildCommit = () => {
  if (process.env.NEXT_PUBLIC_BUILD_COMMIT) {
    return process.env.NEXT_PUBLIC_BUILD_COMMIT;
  }
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA;
  }
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

const resolveBuildVersion = () => {
  if (process.env.NEXT_PUBLIC_BUILD_VERSION) {
    return process.env.NEXT_PUBLIC_BUILD_VERSION;
  }
  if (packageVersion) {
    return packageVersion.startsWith('v') ? packageVersion : `v${packageVersion}`;
  }
  return 'local';
};

// Detect if building for Cloudflare
const isCloudflare = process.env.CF_PAGES === '1' || process.env.CLOUDFLARE_ENV !== undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure no .html extension and no trailing slash for clean URLs
  trailingSlash: false,
  // Skip trailing slash redirect for better performance on Cloudflare
  skipTrailingSlashRedirect: true,
  // Skip static generation for storage page (client component with Node.js dependencies)
  async rewrites() {
    return [
      { source: '/assets/:path*', destination: '/unblocker/assets/:path*' },
      { source: '/styles/:path*', destination: '/unblocker/styles/:path*' },
      { source: '/pages/:path*', destination: '/unblocker/pages/:path*' },
      { source: '/homework/:path*', destination: '/unblocker/homework/:path*' },
      { source: '/stores/:path*', destination: '/unblocker/stores/:path*' },
      { source: '/baremux/:path*', destination: '/unblocker/baremux/:path*' },
      { source: '/fa/:path*', destination: '/unblocker/fa/:path*' },
      { source: '/sw.js', destination: '/unblocker/sw.js' },
      { source: '/start.html', destination: '/unblocker/start.html' },
      { source: '/newtab.html', destination: '/unblocker/newtab.html' },
      { source: '/404.html', destination: '/unblocker/404.html' },
    ];
  },
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: resolveBuildCommit(),
    NEXT_PUBLIC_BUILD_VERSION: resolveBuildVersion(),
    NEXT_PUBLIC_CLUSTER_SERVER_URL: process.env.NEXT_PUBLIC_CLUSTER_SERVER_URL ?? 'https://nachooo.vercel.app',
    NEXT_PUBLIC_PLATFORM: isCloudflare ? 'cloudflare' : 'vercel',
  },
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Performance optimizations
  swcMinify: true,
  compress: true,
  
  // Experimental features for performance
  experimental: {
    // optimizeCss: true,
    optimizePackageImports: ['react', 'react-dom'],
  },
  
  // Aggressive code splitting
<<<<<<< HEAD
  webpack: (config, { dev, isServer, webpack }) => {
    const isCloudflare = process.env.CF_PAGES === '1';
    
=======
  webpack: (config, { dev, isServer, nextRuntime }) => {
    const webpack = require('webpack');

>>>>>>> 99e36c6154dbb1613e773df4bec7bc13d15e9de0
    if (!dev && !isServer) {
      // Production optimizations
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            emulator: {
              name: 'emulator',
              test: /[\\/]lib[\\/](emulators|vm)[\\/]/,
              priority: 30,
              reuseExistingChunk: true,
            },
            wasm: {
              name: 'wasm',
              test: /\.wasm$/,
              priority: 40,
            },
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
            },
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    
    // WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    
<<<<<<< HEAD
    // Fix for fengari (Lua) - ignore Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    
    // Ignore fengari's Node.js-specific modules in browser builds
    if (!isServer) {
      config.plugins = config.plugins || [];
      
      // Ignore Node.js modules when imported by fengari
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(fs|child_process|net|tls|crypto|stream|url|zlib|http|https|assert|os|path)$/,
          contextRegExp: /fengari/,
        })
      );
      
      // Also ignore fengari during SSR (server-side builds)
      if (isServer) {
        config.plugins.push(
          new webpack.IgnorePlugin({
            resourceRegExp: /^fengari$/,
          })
        );
      }
    }
    
    // For server builds, completely ignore fengari
    if (isServer) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^fengari$/,
        })
      );
    }
    
    // Provide lodash globally for all builds (both server and client)
    config.plugins = config.plugins || [];
    // Provide lodash as _ for any code that expects it
=======
    // Provide lodash globally
>>>>>>> 99e36c6154dbb1613e773df4bec7bc13d15e9de0
    config.plugins.push(
      new webpack.ProvidePlugin({
        _: 'lodash',
      })
    );
    
    // Ignore test.js files
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /test\.js$/,
        contextRegExp: /lib\/gpt4free\/model/,
      })
    );
    
    // Fix for Edge Runtime / Cloudflare / Client
    if (nextRuntime === 'edge' || isCloudflare || !isServer) {
      const emptyModulePath = require.resolve('./lib/webpack/empty-module.js');

      // Replace node: modules with empty module
      const nodeModules = ['child_process', 'net', 'tls', 'fs', 'path', 'crypto', 'stream', 'util', 'events', 'buffer', 'process', 'os', 'http', 'https', 'url', 'zlib', 'assert', 'querystring', 'dns', 'dgram', 'cluster', 'module', 'readline', 'repl', 'string_decoder', 'timers', 'tty', 'vm', 'worker_threads'];
      nodeModules.forEach(moduleName => {
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(
            new RegExp(`^node:${moduleName}$`),
            emptyModulePath
          )
        );
      });

      // Also handle non-prefixed modules in resolve.alias
      config.resolve.alias = {
        ...config.resolve.alias,
        '@elastic/ecs-winston-format': false,
        '@ffmpeg-installer/ffmpeg': false,
        '@ffprobe-installer/ffprobe': false,
        'chrome-remote-interface': false,
        'fingerprint-generator': false,
        'fingerprint-injector': false,
        'fluent-ffmpeg': false,
        'puppeteer': false,
        'puppeteer-extra': false,
        'puppeteer-extra-plugin-stealth': false,
        'socket.io-client': false,
        'tunnel': false,
        'winston': false,
        'winston-transport': false,
        'fs': false,
        'path': false,
        'crypto': false,
        'stream': false,
        'util': false,
        'events': false,
        'buffer': false,
        'process': false,
        'os': false,
        'child_process': false,
        'net': false,
        'tls': false,
        'http': false,
        'https': false,
        'url': false,
        'zlib': false,
        'assert': false,
        'querystring': false,
        'dns': false,
        'dgram': false,
        'cluster': false,
        'module': false,
        'readline': false,
        'repl': false,
        'string_decoder': false,
        'timers': false,
        'tty': false,
        'vm': false,
        'worker_threads': false,
        'firebase-admin': false,
        '@google-cloud/firestore': false,
        'google-auth-library': false,
        'google-gax': false,
      };
    }

    // Always replace node:assert with empty module
    const emptyModulePath = require.resolve('./lib/webpack/empty-module.js');
    config.plugins.unshift(
      new webpack.NormalModuleReplacementPlugin(
        /^node:assert$/,
        emptyModulePath
      )
    );

    // Ensure lodash is available
    if (!config.resolve.alias.lodash) {
      config.resolve.alias.lodash = require.resolve('lodash');
    }

    // Alias fengari to empty module for server builds (non-edge)
    if (isServer && nextRuntime !== 'edge') {
      config.resolve.alias.fengari = false;
    }
    
    return config;
  },
  
  // Headers for COOP/COEP (required for SharedArrayBuffer)
  async headers() {
    const hsts =
      process.env.NODE_ENV === 'production'
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
        : [];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
          ...hsts,
        ],
      },
      {
        source: '/android/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/windows/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/library/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/ad/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/unblocker/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/v86/:path*',
        headers: [
           {
             key: 'Cache-Control',
             value: 'public, max-age=31536000, immutable',
           }
        ]
      }
    ];
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
};

module.exports = nextConfig;
