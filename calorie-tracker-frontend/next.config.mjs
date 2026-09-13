/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const gateway = process.env.API_GATEWAY_URL ?? "http://localhost:9080";
    return [
      {
        source: "/api/:path*",
        destination: `${gateway}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
