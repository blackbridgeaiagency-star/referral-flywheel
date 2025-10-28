/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['whop.com'],
  },
  // Fix for build tracing issues and Maximum call stack size exceeded
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
        'node_modules/playwright',
        'node_modules/@playwright',
        '.next/cache/**',
      ],
    },
    // Reduce memory usage during build
    workerThreads: false,
    cpus: 1,
  },
  // Disable static optimization for API routes that need database
  typescript: {
    // Don't fail build on type errors (fix them separately)
    ignoreBuildErrors: false,
  },
  // Reduce bundle analyzer overhead
  productionBrowserSourceMaps: false,
  // Optimize builds
  swcMinify: true,
  compress: true,
  // P2 FIX: Security Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://whop.com https://*.whop.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://whop.com https://*.whop.com",
              "frame-src https://whop.com https://*.whop.com",
              "frame-ancestors https://whop.com https://*.whop.com",
              "base-uri 'self'",
              "form-action 'self' https://whop.com",
            ].join('; '),
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Enable XSS protection (legacy browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Strict Transport Security (HTTPS only)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'interest-cohort=()',
            ].join(', '),
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
