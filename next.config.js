/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Fix for ReactCurrentBatchConfig warning
    config.resolve.alias = {
      ...config.resolve.alias,
      'react/jsx-runtime': require.resolve('react/jsx-runtime'),
    }
    // Suppress specific warnings
    config.module.rules.push({
      test: /\.js$/,
      loader: 'ignore-loader',
      include: [/react-devtools/],
    })
    return config
  }
}

module.exports = nextConfig
