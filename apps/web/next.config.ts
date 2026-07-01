import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @domino/shared se consume ya compilado (dist). No hace falta transpilarlo.
  // App 100% cliente (habla con el socket server externo) → exportación estática.
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
