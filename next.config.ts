import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Content-Type', value: 'application/javascript; charset=utf-8' }] }];
  },
};
export default nextConfig;
