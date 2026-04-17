/** @type {import('next').NextConfig} */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.VIGIL_API_BASE_URL ||
  "";

const API_PORT =
  process.env.NEXT_PUBLIC_API_PORT ||
  process.env.VIGIL_API_PORT ||
  "8004";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const destination = API_BASE_URL
      ? `${API_BASE_URL.replace(/\/$/, "")}/api/:path*`
      : `http://127.0.0.1:${API_PORT}/api/:path*`;

    return [
      {
        source: "/api/:path*",
        destination,
      },
    ];
  },
};

module.exports = nextConfig;
