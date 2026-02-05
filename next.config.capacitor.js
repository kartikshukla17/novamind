/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Capacitor
  output: 'export',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Disable image optimization for static export
    unoptimized: true,
  },
  // Remove headers for static export (not supported)
  webpack: (config, { isServer }) => {
    // Handle Transformers.js: browser must use onnxruntime-web only (no Node backend)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
      // Force browser to use WASM backend — alias Node backend to Web backend
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-node': 'onnxruntime-web',
      }
    } else {
      // Server: keep Node backend as external so it's not bundled
      config.externals = config.externals || []
      config.externals.push({
        'onnxruntime-node': 'commonjs onnxruntime-node',
        'sharp': 'commonjs sharp',
      })
    }

    // Ignore .node native binaries in bundle
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
  // Ensure trailing slashes for static export
  trailingSlash: true,
}

module.exports = nextConfig
