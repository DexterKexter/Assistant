import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  compress: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      'leaflet',
      'react-leaflet',
    ],
  },
}

export default nextConfig
