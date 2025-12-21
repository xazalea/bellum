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

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: resolveBuildCommit(),
    NEXT_PUBLIC_BUILD_VERSION: resolveBuildVersion(),
  },
  reactStrictMode: true,
  
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
    
    // Normalize resolve to handle fengari
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    
    // Alias fengari to empty module for server builds
    if (isServer) {
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
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
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
  
  // Output configuration
  output: 'standalone',
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
};

module.exports = nextConfig;

