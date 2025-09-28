/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Skip ESLint during production builds to avoid blocking on stylistic warnings
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
