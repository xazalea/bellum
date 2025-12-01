/** @type {import('next').NextConfig} */
const nextConfig = {
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
  
  // Headers removed to fix COOP/COEP issues with external resources
  // async headers() {
  //   return [
  //     {
  //       source: '/:path*',
  //       headers: [
  //         {
  //           key: 'Cross-Origin-Embedder-Policy',
  //           value: 'require-corp',
  //         },
  //         {
  //           key: 'Cross-Origin-Opener-Policy',
  //           value: 'same-origin',
  //         },
  //       ],
  //     },
  //   ];
  // },
  
  // Output configuration
  output: 'standalone',
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
};

module.exports = nextConfig;

