import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "media.misscultureglobalkenya.com",
      },
    ],
    // Serve public media directly from R2 or Cloudinary during the transition.
    unoptimized: true,
  },
  // Enable compression for better performance
  compress: true,
};

export default nextConfig;

