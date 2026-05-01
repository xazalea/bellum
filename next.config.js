const webpack = require('webpack');
const path = require('path');

// OpenNext Cloudflare adapter for local development
if (process.env.NODE_ENV === 'development') {
  try {
    const { initOpenNextCloudflareForDev } = require('@opennextjs/cloudflare');
    initOpenNextCloudflareForDev();
  } catch {
    // @opennextjs/cloudflare not installed — skip dev adapter
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Static redirects - handled by Next.js natively
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
    // NOTE: On Cloudflare Workers, packages listed here must actually be
    // available at runtime. Packages that won't exist on Workers (puppeteer,
    // ffmpeg, tiktoken, etc.) are handled via webpack shims instead.
    // Only list packages that are available via nodejs_compat or bundled.
    serverComponentsExternalPackages: [
      // AI packages — these use fetch()/streams compatible with Workers
      '@google/generative-ai',
      'ai',
      'openai',
    ],
  },
  webpack: (config, { isServer }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    // ── Shims for ALL server builds ──────────────────────────────────
    // Browser-only and native packages that can't be bundled server-side.
    // On Cloudflare Workers, Node.js APIs are available via nodejs_compat.
    if (isServer) {
      config.resolve.alias = config.resolve.alias || {};

      // ── Browser-only packages ──────────────────────────────────────
      // These reference `document` / `window` at module level and crash
      // any server-side build. They must only be loaded on the client.
      config.resolve.alias['@fingerprintjs/fingerprintjs'] = false;
      config.resolve.alias['@thumbmarkjs/thumbmarkjs'] = false;
      config.resolve.alias['fingerprint-injector'] = false;
      config.resolve.alias['fingerprint-generator'] = false;

      // Native/bin packages that can't be bundled for server runtime
      // (compat shims that export empty objects, not `false`)
      config.resolve.alias['@ffmpeg-installer/ffmpeg'] = path.resolve(__dirname, 'lib/compat/empty-ffmpeg.js');
      config.resolve.alias['@ffprobe-installer/ffprobe'] = path.resolve(__dirname, 'lib/compat/empty-ffprobe.js');
      config.resolve.alias['fluent-ffmpeg'] = path.resolve(__dirname, 'lib/compat/empty-fluent-ffmpeg.js');
      config.resolve.alias['puppeteer'] = path.resolve(__dirname, 'lib/compat/empty-puppeteer.js');
      config.resolve.alias['puppeteer-extra'] = path.resolve(__dirname, 'lib/compat/empty-puppeteer.js');
      config.resolve.alias['puppeteer-extra-plugin-stealth'] = path.resolve(__dirname, 'lib/compat/empty-puppeteer.js');
    }

    // Ignore README.md and other non-JS files being imported from node_modules
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\.md$|\.txt$|LICENSE/,
        contextRegExp: /node_modules/,
      })
    );

    return config;
  },
};

module.exports = nextConfig;