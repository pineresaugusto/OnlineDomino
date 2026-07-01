import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Permite importar el paquete del monorepo como fuente TypeScript.
  transpilePackages: ['@domino/shared'],
};

export default nextConfig;
