/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer']
  },
  async rewrites() {
    return [
      {
        source: '/python-api/:path*',
        destination: 'http://localhost:8000/:path*'
      }
    ];
  },
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    BRIGHTDATA_API_KEY: process.env.BRIGHTDATA_API_KEY
  }
};

module.exports = nextConfig;
