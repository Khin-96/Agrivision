/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
  },
  webpack: (config) => {
    // Exclude tfjs-node and node-pre-gyp from client bundle
    config.externals = config.externals || [];
    config.externals.push('@tensorflow/tfjs-node', 'node-pre-gyp');
    return config;
  },
  eslint: {
    
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
