/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode
  reactStrictMode: true,

  // 画像最適化設定
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 実験的機能
  experimental: {
    // Server Actionsを有効化（必要に応じて）
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },

  // ヘッダー設定
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },

  // 環境変数の公開設定
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },

  // TypeScript設定
  typescript: {
    // ビルド時の型チェックを厳密に
    ignoreBuildErrors: false,
  },

  // ESLint設定
  eslint: {
    ignoreDuringBuilds: false,
  },

  // バンドル分析（必要時にコメント解除）
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.resolve.alias['@'] = path.join(__dirname, 'src');
  //   }
  //   return config;
  // },
};

module.exports = nextConfig;
