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
  // Skip page data collection for API routes during build
  experimental: {
    skipTrailingSlashRedirect: true,
  },
  // Skip static generation for storage page (client component with Node.js dependencies)
  async rewrites() {
    return [];
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
    // optimizeCss requires critters package - disabled for now
    // optimizeCss: true,
    optimizePackageImports: ['react', 'react-dom'],
  },
  
  // Aggressive code splitting
  webpack: (config, { dev, isServer }) => {
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
            // Emulator code in separate chunk
            emulator: {
              name: 'emulator',
              test: /[\\/]lib[\\/](emulators|vm)[\\/]/,
              priority: 30,
              reuseExistingChunk: true,
            },
            // WASM modules
            wasm: {
              name: 'wasm',
              test: /\.wasm$/,
              priority: 40,
            },
            // React vendor
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Other vendors
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
    
    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Allow Markdown imports from dependencies that include README files
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    
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
      const webpack = require('webpack');
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
      const webpack = require('webpack');
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^fengari$/,
        })
      );
    }
    
    // Provide lodash globally for all builds (both server and client)
    const webpack = require('webpack');
    config.plugins = config.plugins || [];
    // Provide lodash as _ for any code that expects it
    config.plugins.push(
      new webpack.ProvidePlugin({
        _: 'lodash',
      })
    );
    
    // Ignore test.js files that might cause build issues
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /test\.js$/,
        contextRegExp: /lib\/gpt4free\/model/,
      })
    );
    
    // Ignore node: prefixed modules for Edge Runtime builds
    if (isCloudflare || isEdgeRuntime) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^node:/,
        })
      );
    }
    
    // Always replace node:assert with empty module to prevent build errors
    // This is needed for pages that get prerendered even though they're client components
    try {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:assert$/,
          require.resolve('./lib/webpack/empty-module.js')
        )
      );
    } catch (e) {
      // Ignore if empty-module.js doesn't exist yet
    }
    
    // Also ensure lodash is available in the resolve
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    if (!config.resolve.alias.lodash) {
      config.resolve.alias.lodash = require.resolve('lodash');
    }
    
    // Normalize resolve to handle fengari
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    
    // Alias fengari to empty module for server builds
    if (isServer) {
      config.resolve.alias.fengari = false;
    }

    // Edge Runtime builds (including Cloudflare) can't bundle Node-only modules
    if (isCloudflare || isEdgeRuntime) {
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
        // Node.js core modules not available in Edge Runtime
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
        // Firebase Admin requires Node.js runtime
        'firebase-admin': false,
        '@google-cloud/firestore': false,
        'google-auth-library': false,
        'google-gax': false,
        // Node.js prefixed core modules (node:net, node:fs, etc.)
        'node:net': false,
        'node:fs': false,
        'node:path': false,
        'node:crypto': false,
        'node:stream': false,
        'node:util': false,
        'node:events': false,
        'node:buffer': false,
        'node:process': false,
        'node:os': false,
        'node:child_process': false,
        'node:tls': false,
        'node:http': false,
        'node:https': false,
        'node:url': false,
        'node:zlib': false,
        'node:assert': false,
        'node:querystring': false,
        'node:dns': false,
        'node:dgram': false,
        'node:cluster': false,
        'node:module': false,
        'node:readline': false,
        'node:repl': false,
        'node:string_decoder': false,
        'node:timers': false,
        'node:tty': false,
        'node:vm': false,
        'node:worker_threads': false,
      };
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
        // Default: keep security headers, but DO NOT force cross-origin isolation globally.
        // Some third-party scripts (e.g. Vercel toolbar/feedback) are cross-origin and will be blocked by COEP.
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
      // Enable cross-origin isolation ONLY where needed (SharedArrayBuffer for VMs / fast runner).
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
        source: '/vercel.live/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
        ],
      },
      // Ads run inside an internal iframe route. Disable COEP/COOP there so the ad can load cross-origin resources
      // without breaking cross-origin isolation for the main app.
      {
        source: '/ad/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      // Cherri (Unblocker) loads several cross-origin CDN scripts/styles by design.
      // COEP/COOP would block them. We scope-disable isolation for those paths only.
      {
        source: '/unblocker/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          // Cherri is a pinned snapshot; cache aggressively.
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Absolute-path buckets used by Cherri (rewritten to /unblocker/*).
      // Cache aggressively + allow cross-origin subresources (no COEP/COOP isolation).
      {
        source: '/assets/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/styles/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/homework/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/stores/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/fa/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/baremux/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // HTML entrypoints should revalidate, but still allow CDN subresources.
      {
        source: '/start.html',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/newtab.html',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/404.html',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      // Service workers MUST update promptly.
      {
        source: '/sw.js',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'no-store' },
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

  // Rewrites to host Cherri under /unblocker while keeping absolute asset paths.
  // Cherri uses absolute URLs like /assets/*, /pages/*, /stores/*, /sw.js, etc.
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
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
};

module.exports = nextConfig;

