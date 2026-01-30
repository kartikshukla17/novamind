/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Handle Transformers.js - only use web version, not Node.js bindings
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }

    // Ignore native modules that Transformers.js tries to load
    config.externals = config.externals || []
    config.externals.push({
      'onnxruntime-node': 'commonjs onnxruntime-node',
      'sharp': 'commonjs sharp',
    })

    // Ignore .node files
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    })

    return config
  },
  // Experimental settings for better compatibility
  experimental: {
    serverComponentsExternalPackages: ['@xenova/transformers'],
  },
}

module.exports = nextConfig
