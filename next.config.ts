import type { NextConfig } from 'next';

// Car photos are served from Supabase Storage's public buckets.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: supabaseUrl ? [new URL('/storage/v1/object/public/**', supabaseUrl)] : [],
  },
};

export default nextConfig;
