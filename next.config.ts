import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Song thumbnails come from YouTube. If you enable a new OAuth provider and
    // render its avatars with next/image, add that host here too.
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
