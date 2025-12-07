import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    domains: ['api.dicebear.com', 'lh3.googleusercontent.com'],
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:4000/api/:path*',
        },
        {
          source: '/friend-request/:path*',
          destination: 'http://localhost:4000/friend-request/:path*',
        }
      ]
    };
  },
};

export default nextConfig;
