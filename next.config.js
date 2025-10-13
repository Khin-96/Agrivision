/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Strict Mode to prevent WebSocket double-mounting issues
  reactStrictMode: false,
  
  images: {
    domains: ['res.cloudinary.com'],
  },
  
  webpack: (config) => {
    // Exclude tfjs-node and node-pre-gyp from client bundle
    config.externals = config.externals || [];
    config.externals.push('@tensorflow/tfjs-node', 'node-pre-gyp');
    
    // Add Socket.IO externals for better compatibility
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    
    return config;
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;