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
    domains: ['localhost'],
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
    // Suppress the warning about dynamic dependencies in Supabase Realtime
    config.module = {
      ...config.module,
      exprContextCritical: false,
    }
    
    // Handle other webpack configurations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    return config
  }
}

module.exports = nextConfig
