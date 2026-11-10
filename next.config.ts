import type { NextConfig } from "next";
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const version = process.env.NODE_ENV === 'production'
  ? JSON.parse(readFileSync(join(process.cwd(), 'public/version.json'), 'utf8'))
  : { releaseId: 'development' };
if (!/^[a-z0-9][a-z0-9_-]{7,127}$/.test(version.releaseId || '')) throw Error('Run the version generator before building');

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pdf-parse'],
  env: { NEXT_PUBLIC_RELEASE_ID: version.releaseId },
  outputFileTracingIncludes: {
    '/*': ['./email-templates/**/*', './public/version.json'],
    '/api/import/process-pdf': ['./node_modules/pdf-parse/lib/pdf.js/v1.10.100/**/*'],
  },
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

