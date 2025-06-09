
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      'cdn.prod.website-files.com',
      'firebasestorage.googleapis.com', 
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: [
      'https://6000-firebase-studio-1748704043013.cluster-zkm2jrwbnbd4awuedc2alqxrpk.cloudworkstations.dev',
      'http://6000-firebase-studio-1748704043013.cluster-zkm2jrwbnbd4awuedc2alqxrpk.cloudworkstations.dev'
    ],
  },
};

export default nextConfig;
