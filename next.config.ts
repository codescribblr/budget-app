import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default 10MB truncates large backup imports (middleware buffers the full body).
    middlewareClientMaxBodySize: '100mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;

