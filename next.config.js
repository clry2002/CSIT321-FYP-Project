/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bexeexbozsosdtatunld.supabase.co',
      },
    ],
  },
};

export default nextConfig;
