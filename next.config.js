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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://checkout.razorpay.com https://api.razorpay.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
              "connect-src 'self' data: blob: https://*.supabase.co https://*.razorpay.com https://api.razorpay.com wss://*.supabase.co https://huggingface.co https://*.huggingface.co https://*.hf.co https://cas-bridge.xethub.hf.co https://xethub.hf.co https://cdn.jsdelivr.net https://cdn.huggingface.co",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ]
  },
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
}

module.exports = nextConfig
