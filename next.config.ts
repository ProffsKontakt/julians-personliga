import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Konsta ships untranspiled-ish ESM; Next handles it, but this keeps
  // tree-shaking predictable across the react entry point.
  transpilePackages: ['konsta'],
};

export default nextConfig;
