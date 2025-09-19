/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { appDir: true },
  webpack: (config) => {
    // Exclude tfjs-node and node-pre-gyp from client bundle
    config.externals = config.externals || [];
    config.externals.push('@tensorflow/tfjs-node', 'node-pre-gyp');
    return config;
  },
};

module.exports = nextConfig;
