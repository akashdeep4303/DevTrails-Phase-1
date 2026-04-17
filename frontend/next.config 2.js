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
  // macOS / low ulimit: native file watchers can hit EMFILE and Next stops compiling
  // app routes (everything 404s). Polling avoids that.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
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
